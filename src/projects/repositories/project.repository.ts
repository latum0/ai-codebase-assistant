import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectRepository extends EntityRepository<Project> {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {
    super(projectModel);
  }
}
