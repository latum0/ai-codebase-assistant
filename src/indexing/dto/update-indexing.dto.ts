import { PartialType } from '@nestjs/swagger';
import { CreateIndexingDto } from './create-indexing.dto.js';

export class UpdateIndexingDto extends PartialType(CreateIndexingDto) {}
