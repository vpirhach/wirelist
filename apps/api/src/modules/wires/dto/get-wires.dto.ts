import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetWiresDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by unit code' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Filter by panel code' })
  @IsOptional()
  @IsString()
  panel?: string;
}
