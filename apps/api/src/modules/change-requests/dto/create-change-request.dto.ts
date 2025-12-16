import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateChangeRecordDto } from './create-change-record.dto';

/**
 * DTO for creating a change request with multiple wire change records
 */
export class CreateChangeRequestDto {
  @ApiPropertyOptional({ description: 'Comment explaining the change request' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ type: [CreateChangeRecordDto], description: 'Wire change records' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChangeRecordDto)
  records: CreateChangeRecordDto[];
}
