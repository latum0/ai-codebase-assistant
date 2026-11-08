import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateIndexingDto } from '../dto/create-indexing.dto.js';
import { UpdateIndexingDto } from '../dto/update-indexing.dto.js';
import { IndexingService } from '../services/indexing.service.js';

@Controller('indexing')
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post()
  create(@Body() createIndexingDto: CreateIndexingDto) {
    return this.indexingService.create(createIndexingDto);
  }

  @Get()
  findAll() {
    return this.indexingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.indexingService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIndexingDto: UpdateIndexingDto,
  ) {
    return this.indexingService.update(+id, updateIndexingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.indexingService.remove(+id);
  }
}
