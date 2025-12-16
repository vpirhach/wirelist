import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ChangeRecordType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * Represents a single field change with old and new values
 */
export interface FieldChange {
  oldValue: any;
  newValue: any;
}

export class CreateChangeRecordDto {
  @ApiPropertyOptional({ description: 'Wire ID (null for CREATE records)' })
  @IsOptional()
  @Type(() => Number)
  wireId?: number;

  @ApiProperty({ enum: ChangeRecordType })
  @IsEnum(ChangeRecordType)
  recordType: ChangeRecordType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDestination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDestination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  wireCodeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  colorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ioTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sub?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  word?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bits?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  power?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wireNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hwModelsId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noteCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changeNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  changeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hwAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coord?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decommissioned?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ped?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({
    description: 'Changes with old and new values: { fieldName: { oldValue, newValue } }',
  })
  @IsOptional()
  @IsObject()
  changes?: Record<string, FieldChange>;
}

