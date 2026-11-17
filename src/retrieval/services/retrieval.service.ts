import { Injectable } from '@nestjs/common';
import { IndexedChunkRepository } from '../../indexing/repositories/indexed-chunk.repository.js';
import { EmbeddingService } from '../../indexing/services/embedding.service.js';

// This service will turn a question into a vector, find matching chunks,
// and return them with their file paths once retrieval is implemented.
@Injectable()
export class RetrievalService {
  constructor(
    private readonly indexedChunkRepository: IndexedChunkRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}
}
