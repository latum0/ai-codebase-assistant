import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'mohamed@example.com' })
  email!: string;

  @ApiProperty({ example: 'Mohamed' })
  displayName!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/photo.jpg',
    nullable: true,
  })
  photo!: string | null;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;
}
