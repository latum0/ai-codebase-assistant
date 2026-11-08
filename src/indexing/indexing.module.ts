import { Module } from '@nestjs/common';
import { IndexingService } from './services/indexing.service.js';
import { IndexingController } from './controllers/indexing.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { IndexingRun, IndexingRunSchema } from './entities/indexing.entity.js';
import { IndexingRunRepository } from './repositories/indexing.repository.js';
import { CodebaseModule } from '../codebase/codebase.module.js';

@Module({
  imports: [
    CodebaseModule,
    MongooseModule.forFeature([
      {
        name: IndexingRun.name,
        schema: IndexingRunSchema,
      },
    ]),
  ],
  controllers: [IndexingController],
  providers: [IndexingService, IndexingRunRepository],
})
export class IndexingModule {}
