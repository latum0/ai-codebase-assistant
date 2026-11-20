import { Module } from '@nestjs/common';
import { CodebaseModule } from '../codebase/codebase.module.js';
import { IndexingModule } from '../indexing/indexing.module.js';
import { RetrievalController } from './controllers/retrieval.controller.js';
import { RetrievalService } from './services/retrieval.service.js';

@Module({
  imports: [CodebaseModule, IndexingModule],
  controllers: [RetrievalController],
  providers: [RetrievalService],
})
export class RetrievalModule {}
