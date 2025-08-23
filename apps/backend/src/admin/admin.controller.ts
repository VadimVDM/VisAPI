import { Controller, Req, Res, All, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller('admin/queues')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiExcludeEndpoint()
  @All()
  handleAllQueues(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): void {
    const router = this.adminService.getRouter();
    void router(req, res, next);
  }

  @ApiExcludeEndpoint()
  @All(':path(*)')
  handleAllQueueSubPaths(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): void {
    const router = this.adminService.getRouter();
    void router(req, res, next);
  }
}
