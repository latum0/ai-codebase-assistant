import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { UserContext } from '../../utils/decorators/user-context.js';
import { JwtGuard } from '../../auth/guards/jwt.guard.js';
import { CreateProjectDto } from '../dto/create-project.dto.js';
import { UpdateProjectDto } from '../dto/update-project.dto.js';
import { ProjectService } from '../services/project.service.js';
import { ProjectResponseDto } from '../dto/project-response.dto.js';
import { ParseObjectIdPipe } from '../../utils/pipes/parse-object-id.pipe.js';

const ProjectIdParam = ApiParam({
  name: 'id',
  description: 'Project id (Mongo ObjectId)',
  example: '665f1c2e8a1b2c3d4e5f6a7b',
});

@ApiTags('Projects')
@ApiBearerAuth('JWT')
@UseGuards(JwtGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  create(@UserContext() userId: Types.ObjectId, @Body() dto: CreateProjectDto) {
    return this.projectService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List the projects of the current user' })
  @ApiResponse({ status: 200, type: [ProjectResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  findAll(@UserContext() userId: Types.ObjectId) {
    return this.projectService.findAll(userId);
  }

  @Get(':id')
  @ProjectIdParam
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid id' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(
    @UserContext() userId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.projectService.findOne(id, userId);
  }

  @Patch(':id')
  @ProjectIdParam
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid id' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(
    @UserContext() userId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ProjectIdParam
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({ status: 400, description: 'Invalid id' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(
    @UserContext() userId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.projectService.remove(id, userId);
  }
}
