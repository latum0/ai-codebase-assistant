import { Injectable } from '@nestjs/common';
import { CreateCodebaseDto } from '../dto/create-codebase.dto.js';
import { UpdateCodebaseDto } from '../dto/update-codebase.dto.js';

@Injectable()
export class CodebaseService {
  create(createCodebaseDto: CreateCodebaseDto) {
    return 'This action adds a new codebase';
  }

  findAll() {
    return `This action returns all codebase`;
  }

  findOne(id: number) {
    return `This action returns a #${id} codebase`;
  }

  update(id: number, updateCodebaseDto: UpdateCodebaseDto) {
    return `This action updates a #${id} codebase`;
  }

  remove(id: number) {
    return `This action removes a #${id} codebase`;
  }
}
