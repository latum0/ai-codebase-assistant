import { Test, TestingModule } from '@nestjs/testing';
import { IndexingService } from '../services/indexing.service.js';
import { IndexingController } from './indexing.controller.js';
describe('IndexingController', () => {
  let controller: IndexingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndexingController],
      providers: [IndexingService],
    }).compile();

    controller = module.get<IndexingController>(IndexingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
