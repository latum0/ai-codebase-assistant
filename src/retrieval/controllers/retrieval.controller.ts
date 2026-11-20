import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
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
@ApiBearerAuth('JTW')
@UseGuards(JwtGuard)
@Controller('codebase/projects/:projectId/revisions/:revisionId/retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('search')
  @ApiOperation({
    summary: 'Search indexed code in a revision',
    description:
      'Embeds a natural-language question and returns the most similar code chunks from the selected revision.',
  })
  @ApiResponse({ status: 200, description: 'Matching code chunks returned.' })
  @ApiResponse({ status: 400, description: 'Invalid IDs or request body.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Project or revision not found.' })
  @ApiResponse({ status: 409, description: 'Revision has no usable index.' })
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
