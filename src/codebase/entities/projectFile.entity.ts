import { SchemaFactory } from '@nestjs/mongoose';

export class ProjectFile {}

export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);
