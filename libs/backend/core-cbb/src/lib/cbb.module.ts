import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CbbClientService } from './cbb-client.service';
import { ContactResolverService } from './contact-resolver.service';
import { TemplateService } from './template.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  providers: [
    CbbClientService,
    ContactResolverService,
    TemplateService,
  ],
  exports: [
    CbbClientService,
    ContactResolverService,
    TemplateService,
  ],
})
export class CbbModule {}