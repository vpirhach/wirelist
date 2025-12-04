import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UnitPanelsService } from './unit-panels.service';

@ApiTags('Unit and Panel Management')
@Controller('unit-panels')
export class UnitPanelsController {
  constructor(private readonly unitPanelsService: UnitPanelsService) {}

  @Get('units')
  @ApiOperation({
    summary: 'Get all unit codes',
    description: 'Retrieves a sorted list of all unique unit codes from wire data',
  })
  @ApiResponse({
    status: 200,
    description: 'List of unit codes',
    type: [String],
  })
  async getAllUnitCodes(): Promise<string[]> {
    return this.unitPanelsService.getAllUnitCodes();
  }

  @Get('panels')
  @ApiOperation({
    summary: 'Get all panel codes',
    description: 'Retrieves a list of all unique panel codes from wire data',
  })
  @ApiResponse({
    status: 200,
    description: 'List of panel codes',
    type: [String],
  })
  async getAllPanelCodes(): Promise<string[]> {
    return this.unitPanelsService.getAllPanelCodes();
  }

  @Get('units/:unitCode/panels')
  @ApiOperation({
    summary: 'Get panel codes by unit',
    description: 'Retrieves panel codes for a specific unit',
  })
  @ApiParam({ name: 'unitCode', description: 'Unit code to filter by' })
  @ApiResponse({
    status: 200,
    description: 'List of panel codes for the unit',
    type: [String],
  })
  async getPanelCodesByUnit(@Param('unitCode') unitCode: string): Promise<string[]> {
    return this.unitPanelsService.getPanelCodesByUnit(unitCode);
  }
}

