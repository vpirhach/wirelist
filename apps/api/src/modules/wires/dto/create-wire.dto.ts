import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, MaxLength, MinLength } from 'class-validator';

export class CreateWireDto {
  @ApiProperty({ description: 'Source destination (e.g., "1A-P01-X1")', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fromDestination: string;

  @ApiProperty({ description: 'Target destination (e.g., "1A-P02-X2")', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  toDestination: string;

  @ApiPropertyOptional({ description: 'Wire code ID' })
  @IsOptional()
  @IsInt()
  wireCodeId?: number;

  @ApiPropertyOptional({ description: 'Color ID' })
  @IsOptional()
  @IsInt()
  colorId?: number;

  @ApiPropertyOptional({ description: 'I/O Type ID', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ioTypeId?: string;

  @ApiPropertyOptional({ description: 'Sub value' })
  @IsOptional()
  @IsInt()
  sub?: number;

  @ApiPropertyOptional({ description: 'Word value' })
  @IsOptional()
  @IsInt()
  word?: number;

  @ApiPropertyOptional({ description: 'Bits value' })
  @IsOptional()
  @IsInt()
  bits?: number;

  @ApiPropertyOptional({ description: 'Power', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  power?: string;

  @ApiPropertyOptional({ description: 'Origin', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  origin?: string;

  @ApiPropertyOptional({ description: 'Wire number', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  wireNumber?: string;

  @ApiPropertyOptional({ description: 'Hardware models ID' })
  @IsOptional()
  @IsInt()
  hwModelsId?: number;

  @ApiPropertyOptional({ description: 'Remarks', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;

  @ApiPropertyOptional({ description: 'Note code', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  noteCode?: string;

  @ApiPropertyOptional({ description: 'Change number', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  changeNumber?: string;

  @ApiPropertyOptional({ description: 'Change date (ISO format)' })
  @IsOptional()
  @IsDateString()
  changeDate?: string;

  @ApiPropertyOptional({ description: 'Hardware address', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hwAddress?: string;

  @ApiPropertyOptional({ description: 'Coordinates', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  coord?: string;

  @ApiPropertyOptional({ description: 'Decommissioned status', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  decommissioned?: string;

  @ApiPropertyOptional({ description: 'PED', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ped?: string;

  @ApiPropertyOptional({ description: 'Network', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  network?: string;
}
