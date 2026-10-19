import { Module } from '@nestjs/common';
import { CodebaseService } from './services/codebase.service.js';
import { CodebaseController } from './controllers/codebase.controller.js';
import { ProjectFileRepository } from './repositories/projectFile.repository.js';
import { ProjectRevisionRepository } from './repositories/projectRevision.entity.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProjectFile,
  ProjectFileSchema,
} from './entities/projectFile.entity.js';
import {
  ProjectRevision,
  ProjectRevisionSchema,
} from './entities/projectRevision.entity.js';
import { ArchiveService } from './services/archive.service.js';
import { StorageService } from './services/storage.service.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ProjectFile.name,
        schema: ProjectFileSchema,
      },
      {
        name: ProjectRevision.name,
        schema: ProjectRevisionSchema,
      },
    ]),
    ProjectsModule,
  ],
  controllers: [CodebaseController],
  providers: [
    CodebaseService,
    ArchiveService,
    StorageService,
    ProjectFileRepository,
    ProjectRevisionRepository,
  ],
})
export class CodebaseModule {}
