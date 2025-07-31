import { Test, TestingModule } from '@nestjs/testing';
import { ViziWebhooksService } from './vizi-webhooks.service';

describe('ViziWebhooksService', () => {
  let service: ViziWebhooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ViziWebhooksService],
    }).compile();

    service = module.get<ViziWebhooksService>(ViziWebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
