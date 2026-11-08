import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository.js';
import { ProjectRevision } from '../entities/projectRevision.entity.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class ProjectRevisionRepository extends EntityRepository<ProjectRevision> {
  constructor(
    @InjectModel(ProjectRevision.name)
    private readonly projectRevisionModel: Model<ProjectRevision>,
  ) {
    super(projectRevisionModel);
  }
  async getNextVersionNumber(projectId: Types.ObjectId): Promise<number> {
    const latestRevision = await this.projectRevisionModel
      .findOne({ project: projectId })
      .sort({ versionNumber: -1 })
      .select({ versionNumber: 1 })
      .lean()
      .exec();

    return (latestRevision?.versionNumber ?? 0) + 1;
  }
}
