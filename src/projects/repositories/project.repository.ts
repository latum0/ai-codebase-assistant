import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from '../../utils/entity.repository.js';
import { Project } from '../entities/project.entity.js';

@Injectable()
export class ProjectRepository extends EntityRepository<Project> {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {
    super(projectModel);
  }
}
