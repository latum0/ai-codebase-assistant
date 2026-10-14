import { SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

export class Project {}

export const ProjectSchema = SchemaFactory.createForClass(Project);
