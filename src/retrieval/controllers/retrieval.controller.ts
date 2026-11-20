import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtGuard } from '../../auth/guards/jwt.guard.js';
import { UserContext } from '../../utils/decorators/user-context.js';
import { SearchCodeDto } from '../dto/search-code.dto.js';
import { RetrievalService } from '../services/retrieval.service.js';

@ApiTags('Retrieval')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('codebase/projects/:projectId/revisions/:revisionId/retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(
    @Param('projectId', ParseObjectIdPipe) projectId: Types.ObjectId,
    @Param('revisionId', ParseObjectIdPipe) revisionId: Types.ObjectId,
    @Body() body: SearchCodeDto,
    @UserContext() userId: Types.ObjectId,
  ) {
    return this.retrievalService.search(
      userId,
      projectId,
      revisionId,
      body.query,
      body.limit,
    );
  }
}
