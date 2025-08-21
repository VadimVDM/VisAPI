import { Module } from '@nestjs/common';
import { CbbModule } from './cbb.module';

@Module({
  imports: [CbbModule],
  exports: [CbbModule],
})
export class BackendCoreCbbModule {}
