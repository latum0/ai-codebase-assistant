import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsController } from './controllers/projects.controller.js';
import { Project, ProjectSchema } from './entities/project.entity.js';
import { ProjectRepository } from './repositories/project.repository.js';
import { ProjectsService } from './services/projects.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectRepository],
})
export class ProjectsModule {}
