import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository.js';
import { ProjectRevision } from '../entities/projectRevision.entity.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class ProjectRevisionRepository extends EntityRepository<ProjectRevision> {
  constructor(
    @InjectModel(ProjectRevision.name)
    projectRevisionModel: Model<ProjectRevision>,
  ) {
    super(projectRevisionModel);
  }

  async getNextVersionNumber(projectId: Types.ObjectId) {}
}
