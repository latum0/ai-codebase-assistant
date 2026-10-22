import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum ProjectRevisionStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class ProjectRevision {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  project!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  versionNumber!: number;

  @Prop({ type: String, required: true, trim: true })
  originalFileName!: string;

  @Prop({ type: String, required: true })
  archiveStorageKey!: string;

  @Prop({ type: String })
  sourceStoragePrefix?: string;

  @Prop({ type: String, required: true })
  archiveHash!: string;

  @Prop({
    type: String,
    enum: ProjectRevisionStatus,
    default: ProjectRevisionStatus.UPLOADED,
    required: true,
  })
  status!: ProjectRevisionStatus;

  @Prop({ type: Number, default: 0, min: 0 })
  fileCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalSizeBytes!: number;
}

export const ProjectRevisionSchema =
  SchemaFactory.createForClass(ProjectRevision);

ProjectRevisionSchema.index(
  { project: 1, versionNumber: 1 },
  { unique: true },
);