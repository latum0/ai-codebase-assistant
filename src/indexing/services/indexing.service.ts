import { Injectable } from '@nestjs/common';
import { CreateIndexingDto } from '../dto/create-indexing.dto.js';
import { UpdateIndexingDto } from '../dto/update-indexing.dto.js';

@Injectable()
export class IndexingService {
  create(createIndexingDto: CreateIndexingDto) {
    return 'This action adds a new indexing';
  }

  findAll() {
    return `This action returns all indexing`;
  }

  findOne(id: number) {
    return `This action returns a #${id} indexing`;
  }

  update(id: number, updateIndexingDto: UpdateIndexingDto) {
    return `This action updates a #${id} indexing`;
  }

  remove(id: number) {
    return `This action removes a #${id} indexing`;
  }
}
