import { PartialType } from '@nestjs/swagger';
import { CreateCodebaseDto } from './create-codebase.dto.js';

export class UpdateCodebaseDto extends PartialType(CreateCodebaseDto) {}
