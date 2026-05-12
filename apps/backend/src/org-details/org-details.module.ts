import { Module } from '@nestjs/common';
import { OrgDetailsService } from './org-details.service';
import { OrgDetailsController } from './org-details.controller';

@Module({
  providers: [OrgDetailsService],
  controllers: [OrgDetailsController]
})
export class OrgDetailsModule {}
