import { Test, TestingModule } from '@nestjs/testing';
import { PicksController } from './picks.controller';

describe('PicksController', () => {
  let controller: PicksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PicksController],
    }).compile();

    controller = module.get<PicksController>(PicksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
