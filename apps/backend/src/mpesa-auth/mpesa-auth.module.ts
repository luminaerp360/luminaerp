import { Module } from '@nestjs/common';
import { MpesaAuthService } from './mpesa-auth.service';
import { MpesaService } from './mpesa/mpesa.service';
import { MpesaController } from './mpesa/mpesa.controller';

@Module({
  providers: [MpesaAuthService, MpesaService],
  exports: [MpesaService],
  controllers: [MpesaController],
})
export class MpesaAuthModule {}
