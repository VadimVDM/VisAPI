import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData(): { message: string } {
    // Updated to trigger deployment with email module
    return { message: 'Hello API' };
  }
}
