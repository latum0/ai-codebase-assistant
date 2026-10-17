import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { JwtGuard } from '../../auth/guards/jwt.guard.js';
import { UserContext } from '../../utils/decorators/user-context.js';
import { CodebaseService } from '../services/codebase.service.js';

@Controller('projects/:projectId/revisions')
@UseGuards(JwtGuard)
export class CodebaseController {
  constructor(private readonly codebaseService: CodebaseService) {}

  @Get()
  findRevisions(
    @Param('projectId', ParseObjectIdPipe) projectId: Types.ObjectId,
    @UserContext() userId: Types.ObjectId,
  ) {
    return this.codebaseService.findRevisions(projectId, userId);
  }

  @Get(':revisionId')
  findRevision(
    @Param('projectId', ParseObjectIdPipe) projectId: Types.ObjectId,
    @Param('revisionId', ParseObjectIdPipe) revisionId: Types.ObjectId,
    @UserContext() userId: Types.ObjectId,
  ) {
    return this.codebaseService.findRevision(projectId, revisionId, userId);
  }
}
