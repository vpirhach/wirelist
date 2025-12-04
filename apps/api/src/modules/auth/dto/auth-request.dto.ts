import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthRequestDto {
  @ApiProperty({ description: 'Username', example: 'admin' })
  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: 'Password', example: 'admin123!' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(4)
  password: string;
}
