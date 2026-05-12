import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
  imports: [AuthModule],
})
export class OrganizationModule {}
