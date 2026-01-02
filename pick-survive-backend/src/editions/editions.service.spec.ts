import { Test, TestingModule } from '@nestjs/testing';
import { EditionsService } from './editions.service';

describe('EditionsService', () => {
  let service: EditionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EditionsService],
    }).compile();

    service = module.get<EditionsService>(EditionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
