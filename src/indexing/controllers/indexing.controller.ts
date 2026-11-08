import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtGuard } from '../../auth/guards/jwt.guard.js';
import { UserContext } from '../../utils/decorators/user-context.js';
import { IndexingService } from '../services/indexing.service.js';

@ApiTags('Indexing Runs')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('codebase/projects/:projectId/revisions/:revisionId/indexing-runs')
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an indexing run',
    description:
      'Creates a new indexing run for a specific project revision. ' +
      'The authenticated user must own the project.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'MongoDB ObjectId of the project',
    example: '671a12345678901234567890',
  })
  @ApiParam({
    name: 'revisionId',
    description: 'MongoDB ObjectId of the project revision',
    example: '671a12345678901234567891',
  })
  @ApiResponse({
    status: 201,
    description: 'Indexing run successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid projectId or revisionId.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT.',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or revision not found.',
  })
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

  @Get()
  @ApiOperation({
    summary: 'Get all indexing runs',
    description:
      'Returns all indexing runs associated with a specific project revision.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'MongoDB ObjectId of the project',
    example: '671a12345678901234567890',
  })
  @ApiParam({
    name: 'revisionId',
    description: 'MongoDB ObjectId of the project revision',
    example: '671a12345678901234567891',
  })
  @ApiResponse({
    status: 200,
    description: 'Indexing runs successfully retrieved.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid projectId or revisionId.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT.',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or revision not found.',
  })
  findIndexingRuns(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,

    @Param('revisionId', ParseObjectIdPipe)
    revisionId: Types.ObjectId,

    @UserContext() userId: Types.ObjectId,
  ) {
    return this.indexingService.findIndexingRuns(userId, projectId, revisionId);
  }

  @Get(':runId')
  @ApiOperation({
    summary: 'Get an indexing run',
    description:
      'Returns the details of a specific indexing run belonging to a project revision.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'MongoDB ObjectId of the project',
    example: '671a12345678901234567890',
  })
  @ApiParam({
    name: 'revisionId',
    description: 'MongoDB ObjectId of the project revision',
    example: '671a12345678901234567891',
  })
  @ApiParam({
    name: 'runId',
    description: 'MongoDB ObjectId of the indexing run',
    example: '671a12345678901234567892',
  })
  @ApiResponse({
    status: 200,
    description: 'Indexing run successfully retrieved.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid projectId, revisionId, or runId.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT.',
  })
  @ApiResponse({
    status: 404,
    description: 'Project, revision, or indexing run not found.',
  })
  findIndexingRun(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,

    @Param('revisionId', ParseObjectIdPipe)
    revisionId: Types.ObjectId,

    @Param('runId', ParseObjectIdPipe)
    runId: Types.ObjectId,

    @UserContext() userId: Types.ObjectId,
  ) {
    return this.indexingService.findIndexingRun(
      userId,
      projectId,
      revisionId,
      runId,
    );
  }
}
