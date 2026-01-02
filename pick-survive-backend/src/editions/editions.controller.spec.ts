import { Test, TestingModule } from '@nestjs/testing';
import { EditionsController } from './editions.controller';

describe('EditionsController', () => {
  let controller: EditionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EditionsController],
    }).compile();

    controller = module.get<EditionsController>(EditionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
