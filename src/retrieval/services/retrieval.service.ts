import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CodebaseService } from '../../codebase/services/codebase.service.js';
import { IndexedChunkRepository } from '../../indexing/repositories/indexed-chunk.repository.js';
import { EmbeddingService } from '../../indexing/services/embedding.service.js';

const DEFAULT_RESULT_LIMIT = 5;

@Injectable()
export class RetrievalService {
  constructor(
    private readonly indexedChunkRepository: IndexedChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly codebaseService: CodebaseService,
  ) {}

  async search(
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    query: string,
    limit = DEFAULT_RESULT_LIMIT,
  ) {
    // Check ownership and that the revision belongs to this project first.
    await this.codebaseService.findRevision(projectId, revisionId, userId);

    const chunks = await this.indexedChunkRepository.findByProjectRevision(
      projectId,
      revisionId,
    );

    if (chunks.length === 0) {
      throw new ConflictException(
        'This revision has no indexed chunks. Start an indexing run before searching.',
      );
    }

    const queryVector = await this.embeddingService.embed(
      query.trim(),
      'CODE_RETRIEVAL_QUERY',
    );

    const scoredChunks = chunks
      .map((chunk) => ({
        chunk,
        score: this.cosineSimilarity(queryVector, chunk.embedding),
      }))
      .filter(
        (item): item is { chunk: (typeof chunks)[number]; score: number } =>
          item.score !== null,
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ chunk, score }) => ({
        filePath: chunk.filePath,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score,
      }));

    if (scoredChunks.length === 0) {
      throw new ConflictException(
        'The stored vectors do not match the current embedding model. Re-index this revision before searching.',
      );
    }

    return {
      projectId,
      revisionId,
      query: query.trim(),
      resultCount: scoredChunks.length,
      results: scoredChunks,
    };
  }

  private cosineSimilarity(left: number[], right: number[]): number | null {
    if (left.length === 0 || left.length !== right.length) return null;

    let dotProduct = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    for (let index = 0; index < left.length; index++) {
      dotProduct += left[index] * right[index];
      leftMagnitude += left[index] * left[index];
      rightMagnitude += right[index] * right[index];
    }

    if (leftMagnitude === 0 || rightMagnitude === 0) return null;

    return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
  }
}
