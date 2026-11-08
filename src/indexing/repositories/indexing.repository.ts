import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from '../../utils/entity.repository.js';
import { IndexingRun } from '../entities/indexing.entity.js';

@Injectable()
export class IndexingRunRepository extends EntityRepository<IndexingRun> {
  constructor(
    @InjectModel(IndexingRun.name)
    indexingRunModel: Model<IndexingRun>,
  ) {
    super(indexingRunModel);
  }
}
