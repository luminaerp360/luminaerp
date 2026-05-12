import { Module } from '@nestjs/common';
import { LpoService } from './lpo.service';
import { LpoController } from './lpo.controller';
import { AccountsPayableModule } from '../accounts-payable/accounts-payable.module';
import { SettingsModule } from 'src/settings/settings.module';

@Module({
  imports: [AccountsPayableModule, SettingsModule],
  providers: [LpoService],
  controllers: [LpoController],
})
export class LpoModule {}
