import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WiresService } from './wires.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '@prisma/client';
import { GetWiresDto } from './dto/get-wires.dto';
import { CreateWireDto } from './dto/create-wire.dto';
import { UpdateWireDto } from './dto/update-wire.dto';
import { SearchWiresDto } from './dto/search-wires.dto';
import { WireResponseDto } from './dto/wire-response.dto';
import { PaginatedWireResponseDto } from './dto/paginated-wire-response.dto';
import { UnitSummaryDto } from './dto/unit-summary.dto';

@ApiTags('Wires')
@Controller('wires')
export class WiresController {
  constructor(private readonly wiresService: WiresService) {}

  /**
   * Create a new wire
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new wire',
    description: 'Creates a new wire with the provided details',
  })
  @ApiResponse({ status: 201, description: 'Wire created successfully', type: WireResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(
    @Body() createWireDto: CreateWireDto,
    @CurrentUser() user: User,
  ): Promise<WireResponseDto> {
    const wire = await this.wiresService.create(createWireDto, user);
    return WireResponseDto.fromEntity(wire);
  }

  /**
   * Get all wires with pagination and filters
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all wires',
    description:
      'Retrieves a paginated list of all wires with optional filtering by unit and panel',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({ name: 'unit', required: false, type: String, description: 'Filter by unit code' })
  @ApiQuery({ name: 'panel', required: false, type: String, description: 'Filter by panel code' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved wires',
    type: PaginatedWireResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: GetWiresDto): Promise<PaginatedWireResponseDto> {
    const result = await this.wiresService.findAll(query);
    return PaginatedWireResponseDto.fromPaginatedResponse(result);
  }

  /**
   * Search wires by keyword
   */
  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search wires',
    description: 'Search wires by keyword with optional unit filter',
  })
  @ApiQuery({ name: 'keyword', required: true, type: String, description: 'Search keyword' })
  @ApiQuery({ name: 'unit', required: false, type: String, description: 'Filter by unit code' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiResponse({ status: 200, description: 'Search results', type: PaginatedWireResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query() query: SearchWiresDto): Promise<PaginatedWireResponseDto> {
    const result = await this.wiresService.search(query);
    return PaginatedWireResponseDto.fromPaginatedResponse(result);
  }

  /**
   * Get unit summary (matches Java's /unitSummary endpoint)
   */
  @Get('unitSummary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get unit summary',
    description: 'Retrieves a summary of all units with wire counts',
  })
  @ApiResponse({ status: 200, description: 'Unit summary', type: [UnitSummaryDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnitSummary(): Promise<UnitSummaryDto[]> {
    return this.wiresService.getUnitSummary();
  }

  /**
   * Get wires summary (basic statistics)
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get wires summary',
    description: 'Get total count and breakdown by unit',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSummary() {
    return this.wiresService.getSummary();
  }

  /**
   * Get wires by unit (matches Java's /byUnit endpoint)
   */
  @Get('byUnit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get wires by unit', description: 'Retrieves wires filtered by unit' })
  @ApiQuery({ name: 'unit', required: true, type: String, description: 'Unit code to filter by' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiResponse({ status: 200, description: 'Wires by unit', type: PaginatedWireResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getByUnit(
    @Query('unit') unit: string,
    @Query('page') page: number = 0,
    @Query('size') size: number = 30,
  ): Promise<PaginatedWireResponseDto> {
    const result = await this.wiresService.findAll({ unit, page, size });
    return PaginatedWireResponseDto.fromPaginatedResponse(result);
  }

  /**
   * Get wires by panel (matches Java's /byPanel endpoint)
   */
  @Get('byPanel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get wires by panel', description: 'Retrieves wires filtered by panel' })
  @ApiQuery({ name: 'panel', required: true, type: String, description: 'Panel code to filter by' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiResponse({ status: 200, description: 'Wires by panel', type: PaginatedWireResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getByPanel(
    @Query('panel') panel: string,
    @Query('page') page: number = 0,
    @Query('size') size: number = 30,
  ): Promise<PaginatedWireResponseDto> {
    const result = await this.wiresService.findAll({ panel, page, size });
    return PaginatedWireResponseDto.fromPaginatedResponse(result);
  }

  /**
   * Get wire by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get wire by ID', description: 'Retrieve a single wire by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Wire ID' })
  @ApiResponse({ status: 200, description: 'Wire found', type: WireResponseDto })
  @ApiResponse({ status: 404, description: 'Wire not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<WireResponseDto> {
    const wire = await this.wiresService.findOne(BigInt(id));
    if (!wire) {
      throw new NotFoundException(`Wire with ID ${id} not found`);
    }
    return WireResponseDto.fromEntity(wire);
  }

  /**
   * Update wire by ID
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update wire',
    description: 'Updates an existing wire with new details',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Wire ID' })
  @ApiResponse({ status: 200, description: 'Wire updated successfully', type: WireResponseDto })
  @ApiResponse({ status: 404, description: 'Wire not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWireDto: UpdateWireDto,
    @CurrentUser() user: User,
  ): Promise<WireResponseDto> {
    const wire = await this.wiresService.update(BigInt(id), updateWireDto, user);
    return WireResponseDto.fromEntity(wire);
  }

  /**
   * Delete wire by ID
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete wire', description: 'Deletes a wire by its ID (Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Wire ID' })
  @ApiResponse({ status: 204, description: 'Wire deleted successfully' })
  @ApiResponse({ status: 404, description: 'Wire not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User): Promise<void> {
    await this.wiresService.delete(BigInt(id), user);
  }

  /**
   * Delete all wires (Development/Admin only)
   */
  @Delete('dev/delete-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete all wires (Dev only)',
    description: 'Deletes all wires from the database. USE WITH CAUTION!',
  })
  @ApiResponse({ status: 204, description: 'All wires deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteAll(@CurrentUser() user: User): Promise<void> {
    await this.wiresService.deleteAll(user);
  }
}
