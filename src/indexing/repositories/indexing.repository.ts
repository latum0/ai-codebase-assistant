import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Indexing } from '../entities/indexing.entity.js';

@Injectable()
export class IndexingRepository extends EntityRepository<Indexing> {
  constructor(@InjectModel(Indexing.name) indexingModel: Model<Indexing>) {
    super(indexingModel);
  }
}
