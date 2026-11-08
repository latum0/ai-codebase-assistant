import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum IndexingStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class IndexingRun {
  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectRevision',
    required: true,
  })
  revisionId: Types.ObjectId;

  @Prop({
    type: String,
    enum: IndexingStatus,
    default: IndexingStatus.QUEUED,
    required: true,
  })
  status: IndexingStatus;

  @Prop({ type: Number, default: 0, min: 0 })
  filesTotal: number;

  @Prop({ type: Number, default: 0, min: 0 })
  filesProcessed: number;

  @Prop({ type: Number, default: 0, min: 0 })
  filesFailed: number;

  @Prop({ type: Number, default: 0, min: 0 })
  chunksCreated: number;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: String, maxlength: 1000 })
  errorMessage?: string;
}

export const IndexingRunSchema = SchemaFactory.createForClass(IndexingRun);

IndexingRunSchema.index({ revisionId: 1, createdAt: -1 });
