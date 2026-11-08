import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CodebaseService } from '../../codebase/services/codebase.service.js';
import { IndexingStatus } from '../entities/indexing.entity.js';
import { IndexingRunRepository } from '../repositories/indexing.repository.js';

@Injectable()
export class IndexingService {
  constructor(
    private readonly indexingRunRepository: IndexingRunRepository,
    private readonly codebaseService: CodebaseService,
  ) {}

  async createIndexingRun(
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    revisionId: Types.ObjectId,
  ) {
    const revision = await this.codebaseService.findRevision(
      projectId,
      revisionId,
      userId,
    );

    if (revision.status !== 'READY') {
      throw new ConflictException('Cannot index a revision that is not ready.');
    }

    // in case there is a run already in q or running
    const activeRun = await this.indexingRunRepository.findOne({
      revisionId,
      status: {
        $in: [IndexingStatus.QUEUED, IndexingStatus.RUNNING],
      },
    });

    if (activeRun) {
      throw new ConflictException('This revision is already being indexed.');
    }

    return this.indexingRunRepository.create({
      revisionId,
      status: IndexingStatus.QUEUED,
    });
  }
}
