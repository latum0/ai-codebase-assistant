import { Module } from '@nestjs/common';
import { IndexingModule } from '../indexing/indexing.module.js';
import { RetrievalController } from './controllers/retrieval.controller.js';
import { RetrievalService } from './services/retrieval.service.js';

@Module({
  imports: [IndexingModule],
  controllers: [RetrievalController],
  providers: [RetrievalService],
})
export class RetrievalModule {}
