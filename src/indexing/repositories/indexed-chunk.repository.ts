import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
}
