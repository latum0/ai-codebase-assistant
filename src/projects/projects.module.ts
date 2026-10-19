import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectController } from './controllers/project.controller.js';
import { Project, ProjectSchema } from './entities/project.entity.js';
import { ProjectRepository } from './repositories/project.repository.js';
import { ProjectService } from './services/project.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectRepository],
  exports: [ProjectService],
})
export class ProjectsModule {}
