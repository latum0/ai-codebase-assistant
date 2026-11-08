import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { JwtGuard } from '../../auth/guards/jwt.guard.js';
import { UserContext } from '../../utils/decorators/user-context.js';
import { IndexingService } from '../services/indexing.service.js';

@UseGuards(JwtGuard)
@Controller('codebase/projects/:projectId/revisions/:revisionId/indexing-runs')
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post()
  createIndexingRun(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,

    @Param('revisionId', ParseObjectIdPipe)
    revisionId: Types.ObjectId,

    @UserContext() userId: Types.ObjectId,
  ) {
    return this.indexingService.createIndexingRun(
      userId,
      projectId,
      revisionId,
    );
  }
}
