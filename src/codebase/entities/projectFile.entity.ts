import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class ProjectFile {
  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectRevision',
    required: true,
    index: true,
  })
  revision!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  path!: string;

  @Prop({ type: String, trim: true })
  extension?: string;

  @Prop({ type: Number, required: true })
  sizeBytes!: number;

  @Prop({ type: String, required: true })
  contentHash!: string;

  @Prop({ type: Boolean, required: true })
  isIndexable!: boolean;
}

export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);

ProjectFileSchema.index({ revision: 1, path: 1 }, { unique: true });
