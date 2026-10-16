import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateProjectDto } from '../dto/create-project.dto.js';
import { ProjectSourceType } from '../entities/project.entity.js';
import { ProjectRepository } from '../repositories/project.repository.js';

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async create(ownerId: Types.ObjectId, dto: CreateProjectDto) {
    const { repositoryUrl, ...data } = dto;

    return this.projectRepository.create({
      ...data,
      // an uploaded project has no external repository
      ...(dto.sourceType === ProjectSourceType.GITHUB && { repositoryUrl }),
      ownerId,
    });
  }

  async findAll(ownerId: Types.ObjectId) {
    return this.projectRepository.find(
      { ownerId },
      { sort: { createdAt: -1 } },
    );
  }
}
