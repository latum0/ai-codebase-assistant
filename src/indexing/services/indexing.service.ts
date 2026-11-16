import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CodebaseService } from '../../codebase/services/codebase.service.js';
import { ProjectRevisionStatus } from '../../codebase/entities/projectRevision.entity.js';
import { StorageService } from '../../codebase/services/storage.service.js';
import { IndexingStatus } from '../entities/indexingRun.entity.js';
import { IndexedChunkRepository } from '../repositories/indexed-chunk.repository.js';
import { IndexingRunRepository } from '../repositories/indexing.repository.js';
import { EmbeddingService } from './embedding.service.js';

const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.html',
  '.css',
  '.scss',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.cs',
  '.php',
  '.rb',
  '.sh',
  '.yaml',
  '.yml',
  '.toml',
  '.sql',
]);

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const MAX_FILE_SIZE_BYTES = 1024 * 1024;

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private readonly indexingRunRepository: IndexingRunRepository,
    private readonly indexedChunkRepository: IndexedChunkRepository,
    private readonly codebaseService: CodebaseService,
    private readonly storageService: StorageService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async createIndexingRun(
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
  ) {
    const revision = await this.codebaseService.findRevision(
      projectId,
      revisionId,
      userId,
    );

    // The current upload pipeline marks extracted revisions as UPLOADED and
    // does not transition them to READY. Accept both states until that
    // separate revision lifecycle is implemented.
    if (
      revision.status !== ProjectRevisionStatus.READY &&
      revision.status !== ProjectRevisionStatus.UPLOADED
    ) {
      throw new ConflictException('Cannot index a revision that is not ready.');
    }

    const activeRun = await this.indexingRunRepository.findOne({
      revisionId,
      status: { $in: [IndexingStatus.QUEUED, IndexingStatus.RUNNING] },
    });

    if (activeRun) {
      throw new ConflictException('This revision is already being indexed.');
    }

    if (!revision.sourceStoragePrefix) {
      throw new ConflictException('This revision has no extracted source files.');
    }

    const run = await this.indexingRunRepository.create({
      revisionId,
      status: IndexingStatus.QUEUED,
    });

    // This MVP runs the job in this server process. The POST can return the
    // queued run immediately while indexing continues in the background.
    void this.processIndexingRun(
      run._id,
      projectId,
      revisionId,
      revision.sourceStoragePrefix,
    ).catch((error: unknown) => {
      this.logger.error(
        `Unexpected error for indexing run ${run._id}: ${this.errorMessage(error)}`,
      );
    });

    return run;
  }

  async processIndexingRun(
    runId: Types.ObjectId,
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    sourceStoragePrefix: string,
  ): Promise<void> {
    let filesTotal = 0;
    let filesProcessed = 0;
    let filesFailed = 0;
    let chunksCreated = 0;

    try {
      // The conditional update makes claiming the queued job atomic.
      const claimedRun = await this.indexingRunRepository.findOneAndUpdate(
        { _id: runId, status: IndexingStatus.QUEUED },
        {
          $set: {
            status: IndexingStatus.RUNNING,
            startedAt: new Date(),
            filesTotal: 0,
            filesProcessed: 0,
            filesFailed: 0,
            chunksCreated: 0,
            errorMessage: undefined,
          },
        },
      );

      if (!claimedRun) return;

      // Start clean so a re-index replaces the previous revision index.
      await this.indexedChunkRepository.deleteMany({ revisionId });

      const files = await this.codebaseService.findIndexableRevisionFiles(
        revisionId,
      );
      filesTotal = files.length;

      for (const file of files) {
        const extension = file.extension?.toLowerCase() ?? '';

        // Unsupported formats are skipped and counted as examined files.
        if (!SUPPORTED_EXTENSIONS.has(extension)) {
          filesProcessed++;
          continue;
        }

        if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
          filesFailed++;
          continue;
        }

        let chunksSavedForFile = 0;

        try {
          const storageKey = `${sourceStoragePrefix}/${file.path}`;
          const buffer = await this.storageService.readBuffer(storageKey);
          const content = buffer.toString('utf8');

          // Avoid trying to embed binary or blank content.
          if (content.includes('\0') || content.trim().length === 0) {
            filesProcessed++;
            continue;
          }

          const chunks = this.splitIntoChunks(content);

          for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            const embedding = await this.embeddingService.embed(chunk);

            await this.indexedChunkRepository.create({
              projectId,
              revisionId,
              indexingRunId: runId,
              filePath: file.path,
              chunkIndex,
              content: chunk,
              embedding,
            });

            chunksSavedForFile++;
            chunksCreated++;
          }

          filesProcessed++;
        } catch (error: unknown) {
          // Do not leave half of a file in the index if one of its chunks fails.
          await this.indexedChunkRepository.deleteMany({
            revisionId,
            indexingRunId: runId,
            filePath: file.path,
          });
          chunksCreated -= chunksSavedForFile;
          filesFailed++;
          this.logger.warn(
            `Could not index ${file.path}: ${this.errorMessage(error)}`,
          );
        }
      }

      if (filesFailed > 0 && filesFailed === filesTotal) {
        throw new Error('Every indexable file failed to index.');
      }

      // Save aggregate counts once at the end, as requested. During the job,
      // the run remains RUNNING and its counters remain at their initial values.
      await this.indexingRunRepository.findOneAndUpdate(
        { _id: runId },
        {
          $set: {
            status: IndexingStatus.COMPLETED,
            filesTotal,
            filesProcessed,
            filesFailed,
            chunksCreated,
            completedAt: new Date(),
          },
        },
      );
    } catch (error: unknown) {
      const message = this.errorMessage(error);
      this.logger.error(`Indexing run ${runId} failed: ${message}`);

      // Remove any partial results left by a failed run.
      await this.indexedChunkRepository
        .deleteMany({ indexingRunId: runId })
        .catch((cleanupError: unknown) => {
          this.logger.error(
            `Could not clean chunks for run ${runId}: ${this.errorMessage(cleanupError)}`,
          );
        });

      await this.indexingRunRepository.findOneAndUpdate(
        { _id: runId },
        {
          $set: {
            status: IndexingStatus.FAILED,
            filesTotal,
            filesProcessed,
            filesFailed,
            chunksCreated: 0,
            completedAt: new Date(),
            errorMessage: message.slice(0, 1000),
          },
        },
      );
    }
  }

  async findIndexingRuns(
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
  ) {
    await this.codebaseService.findRevision(projectId, revisionId, userId);

    return this.indexingRunRepository.find(
      { revisionId },
      { sort: { createdAt: -1 } },
    );
  }

  async findIndexingRun(
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    runId: Types.ObjectId,
  ) {
    await this.codebaseService.findRevision(projectId, revisionId, userId);

    const indexingRun = await this.indexingRunRepository.findOne({
      _id: runId,
      revisionId,
    });

    if (!indexingRun) {
      throw new NotFoundException('Indexing run not found.');
    }

    return indexingRun;
  }

  private splitIntoChunks(content: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + CHUNK_SIZE, content.length);

      // Prefer a nearby line or word boundary so code is easier to read.
      if (end < content.length) {
        const newline = content.lastIndexOf('\n', end);
        const space = content.lastIndexOf(' ', end);
        const boundary = Math.max(newline, space);

        if (boundary > start + CHUNK_SIZE * 0.6) end = boundary;
      }

      const chunk = content.slice(start, end).trim();
      if (chunk) chunks.push(chunk);

      if (end >= content.length) break;
      start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }

    return chunks;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
