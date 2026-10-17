import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateAuthDto extends PartialType(CreateUserDto) {}
