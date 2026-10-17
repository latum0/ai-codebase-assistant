import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CodebaseService } from '../services/codebase.service.js';
import { CreateCodebaseDto } from '../dto/create-codebase.dto.js';
import { UpdateCodebaseDto } from '../dto/update-codebase.dto.js';

@Controller('codebase')
export class CodebaseController {
  constructor(private readonly codebaseService: CodebaseService) {}

  @Post()
  create(@Body() createCodebaseDto: CreateCodebaseDto) {
    return this.codebaseService.create(createCodebaseDto);
  }

  @Get()
  findAll() {
    return this.codebaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.codebaseService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCodebaseDto: UpdateCodebaseDto,
  ) {
    return this.codebaseService.update(+id, updateCodebaseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.codebaseService.remove(+id);
  }
}
