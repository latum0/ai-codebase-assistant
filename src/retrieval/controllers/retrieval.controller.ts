import { Controller } from '@nestjs/common';
import { RetrievalService } from '../services/retrieval.service.js';

// Routes will be added when the retrieval behavior is implemented.
@Controller('codebase/projects/:projectId/revisions/:revisionId/retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}
}
