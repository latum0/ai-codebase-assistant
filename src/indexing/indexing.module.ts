import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CodebaseModule } from '../codebase/codebase.module.js';
import { IndexingController } from './controllers/indexing.controller.js';
import {
  IndexedChunk,
  IndexedChunkSchema,
} from './entities/indexed-chunk.entity.js';
import { IndexedChunkRepository } from './repositories/indexed-chunk.repository.js';
import { IndexingRunRepository } from './repositories/indexing.repository.js';
import { EmbeddingService } from './services/embedding.service.js';
import { IndexingService } from './services/indexing.service.js';
import {
  IndexingRun,
  IndexingRunSchema,
} from './entities/indexingRun.entity.js';

@Module({
  imports: [
    CodebaseModule,
    MongooseModule.forFeature([
      { name: IndexingRun.name, schema: IndexingRunSchema },
      { name: IndexedChunk.name, schema: IndexedChunkSchema },
    ]),
  ],
  controllers: [IndexingController],
  providers: [
    IndexingService,
    IndexingRunRepository,
    IndexedChunkRepository,
    EmbeddingService,
  ],
})
export class IndexingModule {}
