import { Module } from '@nestjs/common';
import { IndexingService } from './services/indexing.service.js';
import { IndexingController } from './controllers/indexing.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Indexing, IndexingSchema } from './entities/indexing.entity.js';
import { IndexingRepository } from './repositories/indexing.repository.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Indexing.name,
        schema: IndexingSchema,
      },
    ]),
  ],
  controllers: [IndexingController],
  providers: [IndexingService, IndexingRepository],
})
export class IndexingModule {}
