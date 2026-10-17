import { SchemaFactory } from '@nestjs/mongoose';

export class ProjectRevision {}

export const ProjectRevisionSchema =
  SchemaFactory.createForClass(ProjectRevision);
