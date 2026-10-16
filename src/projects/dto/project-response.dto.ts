import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectSourceType } from '../entities/project.entity.js';

export class ProjectResponseDto {
  @ApiProperty({ example: '665f1c2e8a1b2c3d4e5f6a7b' })
  _id!: string;

  @ApiProperty({ example: '665f1c2e8a1b2c3d4e5f6a00' })
  ownerId!: string;

  @ApiProperty({ example: 'My awesome project' })
  name!: string;

  @ApiPropertyOptional({ example: 'Short description of the project' })
  description?: string;

  @ApiProperty({ enum: ProjectSourceType })
  sourceType!: ProjectSourceType;

  @ApiPropertyOptional({ example: 'https://github.com/user/repo' })
  repositoryUrl?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
