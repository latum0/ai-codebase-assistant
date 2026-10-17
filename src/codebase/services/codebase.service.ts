import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectService } from '../../projects/services/project.service.js';
import { ProjectFileRepository } from '../repositories/projectFile.repository.js';
import { ProjectRevisionRepository } from '../repositories/projectRevision.entity.js';

@Injectable()
export class CodebaseService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectRevisionRepository: ProjectRevisionRepository,
    private readonly projectFileRepository: ProjectFileRepository,
  ) {}

  async findRevisions(projectId: Types.ObjectId, userId: Types.ObjectId) {
    // Verify that the project belongs to the current user.
    await this.projectService.findOne(projectId, userId);

    return this.projectRevisionRepository.find(
      { project: projectId },
      { sort: { versionNumber: -1 } },
    );
  }

  async findRevision(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    // Verify project ownership first.
    await this.projectService.findOne(projectId, userId);

    const revision = await this.projectRevisionRepository.findOne({
      _id: revisionId,
      project: projectId,
    });

    if (!revision) {
      throw new NotFoundException('Project revision not found');
    }

    return revision;
  }

  async findRevisionFiles(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    // This also verifies project ownership and revision membership.
    const revision = await this.findRevision(projectId, revisionId, userId);

    return this.projectFileRepository.find({
      revision: revision._id,
    });
  }

  async removeRevision(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const revision = await this.findRevision(projectId, revisionId, userId);

    await this.projectFileRepository.deleteMany({
      revision: revision._id,
    });

    await this.projectRevisionRepository.findOneAndDelete({
      _id: revision._id,
      project: projectId,
    });

    // TODO: Delete the archive and extracted files from storage too.
  }

  async findRevisionFile(
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
    fileId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    // Verify ownership and ensure the revision belongs to the project.
    const revision = await this.findRevision(projectId, revisionId, userId);

    // Find the file only within this revision.
    const file = await this.projectFileRepository.findOne({
      _id: fileId,
      revision: revision._id,
    });

    if (!file) {
      throw new NotFoundException('Project file not found');
    }

    return file;
  }
}
