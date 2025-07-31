import { Test, TestingModule } from '@nestjs/testing';
import { ViziWebhooksController } from './vizi-webhooks.controller';

describe('ViziWebhooksController', () => {
  let controller: ViziWebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViziWebhooksController],
    }).compile();

    controller = module.get<ViziWebhooksController>(ViziWebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
