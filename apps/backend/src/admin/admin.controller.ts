import { Controller, Req, Res, All, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @All('queues/:path(*)')
  getQueues(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): void {
    const router = this.adminService.getRouter();
    void router(req, res, next);
  }
}
