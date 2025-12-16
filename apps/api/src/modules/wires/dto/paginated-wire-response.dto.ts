import { ApiProperty } from '@nestjs/swagger';
import { WireResponseDto } from './wire-response.dto';
import { PaginatedResponseDto, PageResponseDto } from '../../../common/dto/pagination.dto';
import { WireWithPendingUpdates } from '../wires.service';

/**
 * Paginated Wire Response DTO
 * Extends PageResponseDto with Wire-specific typing for Swagger documentation
 */
export class PaginatedWireResponseDto extends PageResponseDto<WireResponseDto> {
  @ApiProperty({ type: [WireResponseDto], description: 'Array of wires in this page' })
  declare content: WireResponseDto[];

  /**
   * Create from service response with automatic mapping
   * Includes pending change records for each wire
   */
  static fromPaginatedResponse(
    result: PaginatedResponseDto<WireWithPendingUpdates>,
  ): PaginatedWireResponseDto {
    return PageResponseDto.from(result, (wire) =>
      WireResponseDto.fromEntity(wire, wire.pendingChangeRecords),
    ) as PaginatedWireResponseDto;
  }
}
