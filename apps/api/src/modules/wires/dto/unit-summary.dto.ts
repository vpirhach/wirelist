import { ApiProperty } from '@nestjs/swagger';

export class UnitSummaryDto {
  @ApiProperty({ description: 'Unit code' })
  unit: string;

  @ApiProperty({ description: 'Number of wires in this unit' })
  count: number;

  @ApiProperty({ description: 'List of panels in this unit' })
  panels: string[];
}
