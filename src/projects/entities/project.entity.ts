import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ProjectSourceType {
  UPLOAD = 'upload',
  GITHUB = 'github',
}

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, enum: ProjectSourceType, required: true })
  sourceType!: ProjectSourceType;

  @Prop({ type: String })
  repositoryUrl?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
