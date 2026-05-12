import { IsNotEmpty, IsString, IsNumberString } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
