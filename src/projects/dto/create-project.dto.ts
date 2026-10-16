import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'My awesome project', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Short description of the project',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ProjectSourceType, example: ProjectSourceType.GITHUB })
  @IsEnum(ProjectSourceType)
  sourceType!: ProjectSourceType;

  @ApiPropertyOptional({
    description: 'Required when sourceType is "github", ignored otherwise',
    example: 'https://github.com/user/repo',
  })
  @ValidateIf(
    (o: CreateProjectDto) => o.sourceType === ProjectSourceType.GITHUB,
  )
  @IsUrl({ require_protocol: true })
  repositoryUrl?: string;
}
