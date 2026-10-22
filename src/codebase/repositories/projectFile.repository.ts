import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository.js';
import { ProjectFile } from '../entities/projectFile.entity.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ProjectFileRepository extends EntityRepository<ProjectFile> {
  constructor(
    @InjectModel(ProjectFile.name) projectFileModel: Model<ProjectFile>,
  ) {
    super(projectFileModel);
  }

  async bulkCreate(files: any) {}
}
