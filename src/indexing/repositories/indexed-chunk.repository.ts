import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EntityRepository } from '../../utils/entity.repository.js';
import { IndexedChunk } from '../entities/indexed-chunk.entity.js';

@Injectable()
export class IndexedChunkRepository extends EntityRepository<IndexedChunk> {
  constructor(
    @InjectModel(IndexedChunk.name)
    indexedChunkModel: Model<IndexedChunk>,
  ) {
    super(indexedChunkModel);
  }

  async findByProjectRevision(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
  ): Promise<IndexedChunk[]> {
    return this.entityModel
      .find({ projectId, revisionId })
      .lean<IndexedChunk[]>()
      .exec();
  }
}
