import { Controller, Get, Req, Res, UseGuards, All } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @All('queues*')
  getQueues(@Req() req: Request, @Res() res: Response) {
    const router = this.adminService.getRouter();
    return router(req, res, () => {});
  }
}
