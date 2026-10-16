import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ProjectSourceType } from '../entities/project.entity.js';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(ProjectSourceType)
  sourceType!: ProjectSourceType;

  @ValidateIf(
    (o: CreateProjectDto) => o.sourceType === ProjectSourceType.GITHUB,
  )
  @IsUrl({ require_protocol: true })
  repositoryUrl?: string;
}
