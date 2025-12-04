import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsNotEmpty({ message: 'Old password is required' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(4)
  newPassword: string;
}
