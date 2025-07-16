import { Controller, Req, Res, All } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @All('queues/*path')
  getQueues(@Req() req: Request, @Res() res: Response): void {
    const router = this.adminService.getRouter();
    router(req, res, () => {});
  }
}
