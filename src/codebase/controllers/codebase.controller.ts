import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtGuard } from '../../auth/guards/jwt.guard.js';
import { UserContext } from '../../utils/decorators/user-context.js';
import { CodebaseService } from '../services/codebase.service.js';

const ProjectIdParam = ApiParam({
  name: 'projectId',
  description: 'Project MongoDB ObjectId',
  example: '665f1c2e8a1b2c3d4e5f6a7b',
});

const RevisionIdParam = ApiParam({
  name: 'revisionId',
  description: 'Project revision MongoDB ObjectId',
  example: '665f1c2e8a1b2c3d4e5f6a7c',
});

const FileIdParam = ApiParam({
  name: 'fileId',
  description: 'Project file MongoDB ObjectId',
  example: '665f1c2e8a1b2c3d4e5f6a7d',
});

@ApiTags('Codebase')
@ApiBearerAuth('JWT')
@UseGuards(JwtGuard)
@Controller('codebase/projects/:projectId/revisions')
export class CodebaseController {
  constructor(private readonly codebaseService: CodebaseService) {}

  @Get()
  @ProjectIdParam
  @ApiOperation({ summary: 'List project revisions' })
  @ApiResponse({
    status: 200,
    description: 'Project revisions retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid project ID' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findRevisions(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,
    @UserContext() userId: Types.ObjectId,
  ) {
    return this.codebaseService.findRevisions(projectId, userId);
  }

  @Get(':revisionId')
  @ProjectIdParam
  @RevisionIdParam
  @ApiOperation({ summary: 'Get revision details and status' })
  @ApiResponse({
    status: 200,
    description: 'Revision details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project or revision ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or revision not found',
  })
  findRevision(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,
    @Param('revisionId', ParseObjectIdPipe)
    revisionId: Types.ObjectId,
    @UserContext() userId: Types.ObjectId,
  ) {
    return this.codebaseService.findRevision(projectId, revisionId, userId);
  }

  @Get(':revisionId/files')
  @ProjectIdParam
  @RevisionIdParam
  @ApiOperation({ summary: 'List files in a project revision' })
  @ApiResponse({
    status: 200,
    description: 'Revision files retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project or revision ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or revision not found',
  })
  findRevisionFiles(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,
    @Param('revisionId', ParseObjectIdPipe)
    revisionId: Types.ObjectId,
    @UserContext() userId: Types.ObjectId,
  ) {
    return this.codebaseService.findRevisionFiles(
      projectId,
      revisionId,
      userId,
    );
  }

  @Get(':revisionId/files/:fileId')
  @ProjectIdParam
  @RevisionIdParam
  @FileIdParam
  @ApiOperation({ summary: 'Get file metadata in a revision' })
  @ApiResponse({
    status: 200,
    description: 'File metadata retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project, revision, or file ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
  })
  @ApiResponse({
    status: 404,
    description: 'Project, revision, or file not found',
  })
  findRevisionFile(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,
    @Param('revisionId', ParseObjectIdPipe)
    revisionId: Types.ObjectId,
    @Param('fileId', ParseObjectIdPipe)
    fileId: Types.ObjectId,
    @UserContext() userId: Types.ObjectId,
  ) {
    return this.codebaseService.findRevisionFile(
      projectId,
      revisionId,
      fileId,
      userId,
    );
  }

  @Delete(':revisionId')
  @ProjectIdParam
  @RevisionIdParam
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project revision' })
  @ApiResponse({
    status: 204,
    description: 'Revision deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project or revision ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or revision not found',
  })
  async removeRevision(
    @Param('projectId', ParseObjectIdPipe)
    projectId: Types.ObjectId,
    @Param('revisionId', ParseObjectIdPipe)
    revisionId: Types.ObjectId,
    @UserContext() userId: Types.ObjectId,
  ): Promise<void> {
    await this.codebaseService.removeRevision(projectId, revisionId, userId);
  }
}
