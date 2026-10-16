import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserContext } from '../../utils/decorators/user-context.js';
import { JwtGuard } from '../../auth/guards/jwt.guard.js';
import { CreateProjectDto } from '../dto/create-project.dto.js';
import { ProjectService } from '../services/project.service.js';

@UseGuards(JwtGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(@UserContext() userId: Types.ObjectId, @Body() dto: CreateProjectDto) {
    return this.projectService.create(userId, dto);
  }

  @Get()
  findAll(@UserContext() userId: Types.ObjectId) {
    return this.projectService.findAll(userId);
  }
}
