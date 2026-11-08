import { Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Indexing {}

export const IndexingSchema = SchemaFactory.createForClass(Indexing);
