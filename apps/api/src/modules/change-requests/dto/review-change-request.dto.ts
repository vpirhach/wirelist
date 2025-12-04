import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveChangeRequestDto {
  @ApiPropertyOptional({ description: 'Optional comment when approving' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class DeclineChangeRequestDto {
  @ApiPropertyOptional({ description: 'Reason for declining the change request' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class BatchReviewDto {
  @ApiProperty({ description: 'IDs of change requests to review', type: [Number] })
  ids: number[];

  @ApiPropertyOptional({ description: 'Comment for the review action' })
  @IsOptional()
  @IsString()
  comment?: string;
}

