import { Module } from '@nestjs/common';
import { CgbModule } from './cgb.module';

@Module({
  imports: [CgbModule],
  exports: [CgbModule],
})
export class BackendCoreCgbModule {}
