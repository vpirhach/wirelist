import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, ChangeRequestStatus } from '@prisma/client';
import { ChangeRequestsService } from './change-requests.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import {
  ApproveChangeRequestDto,
  DeclineChangeRequestDto,
} from './dto/review-change-request.dto';
import {
  ChangeRequestResponseDto,
  AuthorGroupedChangeRequestsDto,
} from './dto/change-request-response.dto';
import { PageResponseDto } from '../../common/dto/pagination.dto';

@ApiTags('Change Requests')
@ApiBearerAuth()
@Controller('change-requests')
@UseGuards(JwtAuthGuard)
export class ChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a change request with multiple change records' })
  @ApiResponse({ status: 201, type: ChangeRequestResponseDto })
  async create(
    @Body() dto: CreateChangeRequestDto,
    @CurrentUser() user: User,
  ): Promise<ChangeRequestResponseDto> {
    return this.changeRequestsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pending change requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async findAllPending(
    @Query('page') page?: number,
    @Query('size') size?: number,
  ): Promise<PageResponseDto<ChangeRequestResponseDto>> {
    const result = await this.changeRequestsService.findAllPending(page || 0, size || 50);
    return PageResponseDto.fromRaw(result);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all change requests with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
  @ApiQuery({ name: 'size', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'unit', required: false, type: String, description: 'Filter by unit code' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ChangeRequestStatus,
    description: 'Filter by status',
  })
  @ApiResponse({ status: 200 })
  async findAllWithFilters(
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('unit') unit?: string,
    @Query('status') status?: ChangeRequestStatus,
  ): Promise<PageResponseDto<ChangeRequestResponseDto>> {
    const result = await this.changeRequestsService.findAllWithFilters(
      page || 0,
      size || 50,
      unit,
      status,
    );
    return PageResponseDto.fromRaw(result);
  }

  @Get('grouped-by-author')
  @ApiOperation({ summary: 'Get pending change requests grouped by author' })
  @ApiResponse({ status: 200, type: [AuthorGroupedChangeRequestsDto] })
  async findPendingGroupedByAuthor(): Promise<AuthorGroupedChangeRequestsDto[]> {
    return this.changeRequestsService.findPendingGroupedByAuthor();
  }

  @Get('all-grouped-by-author')
  @ApiOperation({ summary: 'Get ALL change requests grouped by author (includes all statuses)' })
  @ApiResponse({ status: 200, type: [AuthorGroupedChangeRequestsDto] })
  async findAllGroupedByAuthor(): Promise<AuthorGroupedChangeRequestsDto[]> {
    return this.changeRequestsService.findAllGroupedByAuthor();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single change request by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ChangeRequestResponseDto })
  async findOne(@Param('id') id: string): Promise<ChangeRequestResponseDto> {
    return this.changeRequestsService.findOne(BigInt(id));
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a change request (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ChangeRequestResponseDto })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveChangeRequestDto,
    @CurrentUser() reviewer: User,
  ): Promise<ChangeRequestResponseDto> {
    return this.changeRequestsService.approve(BigInt(id), reviewer, dto.comment);
  }

  @Post(':id/decline')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline a change request (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ChangeRequestResponseDto })
  async decline(
    @Param('id') id: string,
    @Body() dto: DeclineChangeRequestDto,
    @CurrentUser() reviewer: User,
  ): Promise<ChangeRequestResponseDto> {
    return this.changeRequestsService.decline(BigInt(id), reviewer, dto.comment);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject/delete a change request (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204 })
  async reject(@Param('id') id: string, @CurrentUser() reviewer: User): Promise<void> {
    return this.changeRequestsService.reject(BigInt(id), reviewer);
  }

  @Post('approve-by-author/:authorId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve all pending requests from an author (Admin only)' })
  @ApiParam({ name: 'authorId', type: String })
  @ApiResponse({ status: 200 })
  async approveByAuthor(
    @Param('authorId') authorId: string,
    @Body() dto: ApproveChangeRequestDto,
    @CurrentUser() reviewer: User,
  ): Promise<{ approvedCount: number }> {
    const count = await this.changeRequestsService.approveByAuthor(
      BigInt(authorId),
      reviewer,
      dto.comment,
    );
    return { approvedCount: count };
  }

  @Post('decline-by-author/:authorId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline all pending requests from an author (Admin only)' })
  @ApiParam({ name: 'authorId', type: String })
  @ApiResponse({ status: 200 })
  async declineByAuthor(
    @Param('authorId') authorId: string,
    @Body() dto: DeclineChangeRequestDto,
    @CurrentUser() reviewer: User,
  ): Promise<{ declinedCount: number }> {
    const count = await this.changeRequestsService.declineByAuthor(
      BigInt(authorId),
      reviewer,
      dto.comment,
    );
    return { declinedCount: count };
  }

  @Delete('reject-by-author/:authorId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject/delete all pending requests from an author (Admin only)' })
  @ApiParam({ name: 'authorId', type: String })
  @ApiResponse({ status: 200 })
  async rejectByAuthor(
    @Param('authorId') authorId: string,
    @CurrentUser() reviewer: User,
  ): Promise<{ rejectedCount: number }> {
    const count = await this.changeRequestsService.rejectByAuthor(BigInt(authorId), reviewer);
    return { rejectedCount: count };
  }
}
