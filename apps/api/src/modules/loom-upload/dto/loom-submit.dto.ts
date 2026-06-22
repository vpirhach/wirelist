import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';

export class LoomSubmitDto {
  @ApiProperty({ description: 'Server-issued id from POST /loom-upload/preview' })
  @IsUUID()
  previewId: string;

  @ApiProperty({ description: 'Preview item ids to include in the change request' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedItemIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
