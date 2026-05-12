import { Module, forwardRef } from '@nestjs/common';
import { AuthController, GlobalAuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { SettingsModule } from '../settings/settings.module';
import { SelfRegistrationService } from './self-registration.service';
import { EmailsModule } from '../emails/emails.module';

@Module({
  controllers: [AuthController, GlobalAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    SelfRegistrationService,
  ],
  imports: [
    JwtModule.register({}),
    SettingsModule,
    forwardRef(() => EmailsModule),
  ],
  exports: [AuthService, JwtStrategy, GoogleStrategy, SelfRegistrationService],
})
export class AuthModule {}
