import { IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserRegistrationDto {
  @ApiProperty({ description: 'Username', example: 'newuser' })
  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
