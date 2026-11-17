import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class IndexedChunk {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectRevision',
    required: true,
    index: true,
  })
  revisionId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'IndexingRun',
    required: true,
    index: true,
  })
  indexingRunId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  filePath!: string;

  @Prop({ type: Number, required: true })
  chunkIndex!: number;

  @Prop({ type: String, required: true })
  content!: string;

  // the vector
  @Prop({ type: [Number], required: true })
  embedding!: number[];
}

export const IndexedChunkSchema = SchemaFactory.createForClass(IndexedChunk);

IndexedChunkSchema.index({
  revisionId: 1,
  filePath: 1,
  chunkIndex: 1,
});
