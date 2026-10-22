import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectService } from '../../projects/services/project.service.js';
import { ProjectFileRepository } from '../repositories/projectFile.repository.js';
import { ProjectRevisionRepository } from '../repositories/projectRevision.entity.js';
import { createHash } from 'crypto';
import { ArchiveService } from './archive.service.js';
import { StorageService } from './storage.service.js';
import { readFile } from 'node:fs/promises';
import { ProjectRevisionStatus } from '../entities/projectRevision.entity.js';

@Injectable()
export class CodebaseService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectRevisionRepository: ProjectRevisionRepository,
    private readonly projectFileRepository: ProjectFileRepository,
    private readonly archiveService: ArchiveService,
    private readonly storageService: StorageService,
  ) {}

  async uploadZip(
    userId: Types.ObjectId,
    file: Express.Multer.File,
    projectId: Types.ObjectId,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A non-empty ZIP file is required');
    }

    // ensure the project belongs to the user
    //TODO:change type later;
    const project: any = await this.projectService.ensureOwnedProject(
      userId,
      projectId,
    );

    const versionNumber =
      (await this.projectRevisionRepository.getNextVersionNumber(
        project._id,
      )) as unknown as number;

    const archiveHash = createHash('sha256').update(file.buffer).digest('hex');

    const revisionId = new Types.ObjectId();

    const storageRoot = `projects/${project._id}/revisions/${revisionId.toString()}`;

    const archiveStorageKey = `${storageRoot}/archive.zip`;
    const sourceStoragePrefix = `${storageRoot}/files`;

    const extractedFiles = this.archiveService.extractAndScan(file.buffer);

    try {
      await this.projectRevisionRepository.create({
        _id: revisionId,
        project: projectId,
        versionNumber,
        originalFileName: file.originalname,
        archiveStorageKey,
        archiveHash,
        status: ProjectRevisionStatus.PROCESSING,
      });

      await this.storageService.saveBuffer(archiveStorageKey, file.buffer);

      const fileRecords = [];

      for (const file of extractedFiles.files) {
        const storageKey = `${sourceStoragePrefix}/${file.relatePath}`;
        const content = await readFile(file.absolutePath);

        await this.storageService.saveBuffer(storageKey, content);

        fileRecords.push({
          revision: revisionId,
          path: file.relativePath,
          extension: file.extension,
          sizeBytes: file.sizeBytes,
          contentHash: file.contentHash,
          isIndexable: file.isIndexable,
        });
      }

      await this.projectFileRepository.insertMany(fileRecords);
      return await this.projectRevisionRepository.findOneAndUpdate(
        { _id: revisionId },
        {
          status: ProjectRevisionStatus.UPLOADED,
          filecount: fileRecords.length,
          totalSizeBytes: extractedFiles.totalSizeBytes,
        },
      );
    } catch (err) {
      throw err;
    }
  }

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
