import { Test, TestingModule } from '@nestjs/testing';
import { CodebaseController } from './controllers/codebase.controller.js';
import { CodebaseService } from './services/codebase.service.js';

describe('CodebaseController', () => {
  let controller: CodebaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodebaseController],
      providers: [CodebaseService],
    }).compile();

    controller = module.get<CodebaseController>(CodebaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
