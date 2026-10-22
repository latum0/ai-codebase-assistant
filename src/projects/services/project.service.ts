import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateProjectDto } from '../dto/create-project.dto.js';
import { ProjectSourceType } from '../entities/project.entity.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { UpdateProjectDto } from '../dto/update-project.dto.js';

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

  async findOne(id: Types.ObjectId, ownerId: Types.ObjectId) {
    const project = await this.projectRepository.findOne({ _id: id, ownerId });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }

  async update(
    id: Types.ObjectId,
    ownerId: Types.ObjectId,
    dto: UpdateProjectDto,
  ) {
    const current = await this.findOne(id, ownerId);

    const sourceType = dto.sourceType ?? current.sourceType;
    const repositoryUrl = dto.repositoryUrl ?? current.repositoryUrl;

    if (sourceType === ProjectSourceType.GITHUB && !repositoryUrl) {
      throw new BadRequestException(
        'repositoryUrl is required for GitHub projects.',
      );
    }

    const update =
      sourceType === ProjectSourceType.UPLOAD
        ? {
            $set: { ...dto, repositoryUrl: undefined },
            $unset: { repositoryUrl: '' },
          }
        : { $set: dto };

    const project = await this.projectRepository.findOneAndUpdate(
      { _id: id, ownerId },
      update,
    );

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }

  async remove(id: Types.ObjectId, ownerId: Types.ObjectId): Promise<void> {
    const project = await this.projectRepository.findOneAndDelete({
      _id: id,
      ownerId,
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }
  }

  async ensureOwnedProject(userId: Types.ObjectId, projectId: Types.ObjectId) {}
}
