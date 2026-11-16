import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository.js';
import { ProjectFile } from '../entities/projectFile.entity.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class ProjectFileRepository extends EntityRepository<ProjectFile> {
  constructor(
    @InjectModel(ProjectFile.name)
    private readonly projectFileModel: Model<ProjectFile>,
  ) {
    super(projectFileModel);
  }

  async findByRevision(revisionId: Types.ObjectId): Promise<ProjectFile[]> {
    return this.projectFileModel
      .find({ revision: revisionId, isIndexable: true })
      .lean<ProjectFile[]>()
      .exec();
  }
}
