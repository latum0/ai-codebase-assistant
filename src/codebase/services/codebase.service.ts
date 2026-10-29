import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Connection, Types } from 'mongoose';
import { ProjectService } from '../../projects/services/project.service.js';
import { ProjectFileRepository } from '../repositories/projectFile.repository.js';
import { ProjectRevisionRepository } from '../repositories/projectRevision.entity.js';
import { createHash } from 'crypto';
import { ArchiveService, ExtractedArchive } from './archive.service.js';
import { StorageService } from './storage.service.js';
import { readFile } from 'node:fs/promises';
import { ProjectRevisionStatus } from '../entities/projectRevision.entity.js';

import { basename, extname } from 'node:path';
import { InjectConnection } from '@nestjs/mongoose';
import { ProjectFile } from '../entities/projectFile.entity.js';

export interface UploadedZipFile {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class CodebaseService {
  private readonly logger = new Logger(CodebaseService.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly projectRevisionRepository: ProjectRevisionRepository,
    private readonly projectFileRepository: ProjectFileRepository,
    private readonly archiveService: ArchiveService,
    private readonly storageService: StorageService,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async uploadZip(
    userId: Types.ObjectId,
    file: UploadedZipFile,
    projectId: Types.ObjectId,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A non-empty ZIP file is required');
    }

    if (extname(file.originalname).toLowerCase() !== '.zip') {
      throw new BadRequestException('Only ZIP files are accepted');
    }

    // 1. Verify that the user owns the project.
    const project = await this.projectService.ensureOwnedProject(
      userId,
      projectId,
    );

    // 2. Calculate a hash of the original ZIP.
    const archiveHash = createHash('sha256').update(file.buffer).digest('hex');

    let extracted: ExtractedArchive | undefined;
    let revisionId: Types.ObjectId | undefined;
    let storageRoot: string | undefined;
    let revisionCreated = false;

    try {
      // 3. Validate the ZIP and extract its files.
      extracted = await this.archiveService.extractAndScan(file.buffer);

      revisionId = new Types.ObjectId();

      storageRoot = `projects/${project._id}/revisions/${revisionId.toString()}`;

      const archiveStorageKey = `${storageRoot}/archive.zip`;
      const sourceStoragePrefix = `${storageRoot}/files`;

      const originalFileName = basename(file.originalname.replace(/\\/g, '/'));

      // 4. Allocate a revision number.
      // Retry if another upload creates the same version concurrently.
      for (let attempt = 0; attempt < 3; attempt++) {
        const versionNumber =
          await this.projectRevisionRepository.getNextVersionNumber(
            project._id,
          );

        try {
          await this.projectRevisionRepository.create({
            _id: revisionId,
            project: project._id,
            versionNumber,
            originalFileName,
            archiveStorageKey,
            sourceStoragePrefix,
            archiveHash,
            status: ProjectRevisionStatus.PROCESSING,
            fileCount: 0,
            totalSizeBytes: 0,
          });

          revisionCreated = true;
          break;
        } catch (error: unknown) {
          const duplicateKey =
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000;

          if (duplicateKey && attempt < 2) {
            continue;
          }

          if (duplicateKey) {
            throw new ConflictException(
              'Could not allocate a unique revision. Please retry.',
            );
          }

          throw error;
        }
      }

      if (!revisionCreated) {
        throw new ConflictException('Failed to create project revision');
      }

      // 5. Store the original ZIP.
      await this.storageService.saveBuffer(archiveStorageKey, file.buffer);

      // 6. Store the extracted files and prepare their MongoDB records.
      const fileRecords: Partial<ProjectFile>[] = [];

      for (const extractedFile of extracted.files) {
        const storageKey = `${sourceStoragePrefix}/${extractedFile.relativePath}`;

        const content = await readFile(extractedFile.absolutePath);

        await this.storageService.saveBuffer(storageKey, content);

        fileRecords.push({
          revision: revisionId,
          path: extractedFile.relativePath,
          extension: extractedFile.extension,
          sizeBytes: extractedFile.sizeBytes,
          contentHash: extractedFile.contentHash,
          isIndexable: extractedFile.isIndexable,
        });
      }

      // 7. Atomically save file records and mark the revision UPLOADED.
      const session = await this.connection.startSession();

      try {
        const completedRevision = await session.withTransaction(async () => {
          if (fileRecords.length > 0) {
            await this.projectFileRepository.insertMany(fileRecords, {
              session,
            });
          }

          const updatedRevision =
            await this.projectRevisionRepository.findOneAndUpdate(
              { _id: revisionId },
              {
                $set: {
                  status: ProjectRevisionStatus.UPLOADED,
                  fileCount: fileRecords.length,
                  totalSizeBytes: extracted!.totalSizeBytes,
                },
              },
              undefined,
              session,
            );

          if (!updatedRevision) {
            throw new Error('Failed to update project revision');
          }

          return updatedRevision;
        });

        if (!completedRevision) {
          throw new Error('The upload transaction returned no revision');
        }

        return completedRevision;
      } finally {
        await session.endSession();
      }
    } catch (error: unknown) {
      if (storageRoot) {
        try {
          await this.storageService.deletePrefix(storageRoot);
        } catch (cleanupError: unknown) {
          this.logger.error(
            `Failed to clean storage prefix ${storageRoot}`,
            cleanupError instanceof Error
              ? cleanupError.stack
              : String(cleanupError),
          );
        }
      }

      if (revisionCreated && revisionId) {
        try {
          await this.projectFileRepository.deleteMany({
            revision: revisionId,
          });
        } catch (cleanupError: unknown) {
          this.logger.error(
            `Failed to clean files for revision ${revisionId}`,
            cleanupError instanceof Error
              ? cleanupError.stack
              : String(cleanupError),
          );
        }

        try {
          await this.projectRevisionRepository.findOneAndUpdate(
            { _id: revisionId },
            {
              $set: {
                status: ProjectRevisionStatus.FAILED,
              },
            },
          );
        } catch (cleanupError: unknown) {
          this.logger.error(
            `Failed to mark revision ${revisionId} as FAILED`,
            cleanupError instanceof Error
              ? cleanupError.stack
              : String(cleanupError),
          );
        }
      }

      throw error;
    } finally {
      if (extracted) {
        try {
          await this.archiveService.cleanup(extracted.tempDirectory);
        } catch (cleanupError: unknown) {
          this.logger.error(
            'Failed to clean temporary extraction directory',
            cleanupError instanceof Error
              ? cleanupError.stack
              : String(cleanupError),
          );
        }
      }
    }
  }
  async findRevisions(projectId: Types.ObjectId, userId: Types.ObjectId) {
    // Verify that the project belongs to the current user.
    await this.projectService.findOne(projectId, userId);

    return this.projectRevisionRepository.find(
      { project: projectId },
      { sort: { versionNumber: -1 } },
    );
  }

  async findRevision(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    // Verify project ownership first.
    await this.projectService.findOne(projectId, userId);

    const revision = await this.projectRevisionRepository.findOne({
      _id: revisionId,
      project: projectId,
    });

    if (!revision) {
      throw new NotFoundException('Project revision not found');
    }

    return revision;
  }

  async findRevisionFiles(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    const revision = await this.findRevision(projectId, revisionId, userId);

    return this.projectFileRepository.find({
      revision: revision._id,
    });
  }

  async removeRevision(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const revision = await this.findRevision(projectId, revisionId, userId);

    await this.projectFileRepository.deleteMany({
      revision: revision._id,
    });

    await this.projectRevisionRepository.findOneAndDelete({
      _id: revision._id,
      project: projectId,
    });

    // TODO: Delete the archive and extracted files from storage too.
  }

  async findRevisionFile(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    fileId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    // Verify ownership and ensure the revision belongs to the project.
    const revision = await this.findRevision(projectId, revisionId, userId);

    // Find the file only within this revision.
    const file = await this.projectFileRepository.findOne({
      _id: fileId,
      revision: revision._id,
    });

    if (!file) {
      throw new NotFoundException('Project file not found');
    }

    return file;
  }
}
