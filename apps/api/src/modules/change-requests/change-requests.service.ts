import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User, ChangeRequestStatus, ChangeRequestType, Prisma } from '@prisma/client';
import {
  CreateChangeRequestDto,
  BatchCreateChangeRequestDto,
} from './dto/create-change-request.dto';
import {
  ChangeRequestResponseDto,
  AuthorGroupedChangeRequestsDto,
  AuthorDto,
} from './dto/change-request-response.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ChangeRequestsService {
  private readonly logger = new Logger(ChangeRequestsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a single change request
   * @param batchId - Optional batch ID for grouping requests created together
   */
  async create(
    dto: CreateChangeRequestDto,
    author: User,
    batchId?: string,
  ): Promise<ChangeRequestResponseDto> {
    this.logger.log(`Creating change request by ${author.username}: ${dto.requestType}`);

    // Validate: UPDATE and DELETE must have wireId
    if ((dto.requestType === 'UPDATE' || dto.requestType === 'DELETE') && !dto.wireId) {
      throw new BadRequestException(`wireId is required for ${dto.requestType} requests`);
    }

    // Validate: CREATE must not have wireId
    if (dto.requestType === 'CREATE' && dto.wireId) {
      throw new BadRequestException('wireId should not be provided for CREATE requests');
    }

    const changeRequest = await this.prisma.wireChangeRequest.create({
      data: {
        wireId: dto.wireId ? BigInt(dto.wireId) : null,
        requestType: dto.requestType as ChangeRequestType,
        fromDestination: dto.fromDestination,
        toDestination: dto.toDestination,
        wireCodeId: dto.wireCodeId,
        colorId: dto.colorId,
        ioTypeId: dto.ioTypeId,
        sub: dto.sub,
        word: dto.word,
        bits: dto.bits,
        power: dto.power,
        origin: dto.origin,
        wireNumber: dto.wireNumber,
        hwModelsId: dto.hwModelsId,
        remarks: dto.remarks,
        noteCode: dto.noteCode,
        changeNumber: dto.changeNumber,
        changeDate: dto.changeDate ? new Date(dto.changeDate) : null,
        hwAddress: dto.hwAddress,
        coord: dto.coord,
        decommissioned: dto.decommissioned,
        ped: dto.ped,
        network: dto.network,
        changes: dto.changes ? (dto.changes as any) : Prisma.DbNull,
        batchId: batchId || null,
        authorId: author.id,
        status: ChangeRequestStatus.PENDING,
      },
      include: { author: true },
    });

    return ChangeRequestResponseDto.fromEntity(changeRequest as any);
  }

  /**
   * Create multiple change requests at once (batch update from table)
   * All requests in the batch share the same batchId for grouping
   */
  async createBatch(
    dto: BatchCreateChangeRequestDto,
    author: User,
  ): Promise<ChangeRequestResponseDto[]> {
    if (!dto.requests || !Array.isArray(dto.requests)) {
      throw new BadRequestException('requests array is required');
    }

    if (dto.requests.length === 0) {
      return [];
    }

    // Generate a unique batch ID for this batch of requests
    const batchId = randomUUID();

    this.logger.log(
      `Creating ${dto.requests.length} change requests by ${author.username} with batchId: ${batchId}`,
    );

    const results: ChangeRequestResponseDto[] = [];

    for (const request of dto.requests) {
      const result = await this.create(request, author, batchId);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all pending change requests
   */
  async findAllPending(
    page: number = 0,
    size: number = 50,
  ): Promise<PaginatedResponseDto<ChangeRequestResponseDto>> {
    const skip = page * size;

    const [requests, total] = await Promise.all([
      this.prisma.wireChangeRequest.findMany({
        where: { status: ChangeRequestStatus.PENDING },
        include: { author: true, reviewer: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.wireChangeRequest.count({
        where: { status: ChangeRequestStatus.PENDING },
      }),
    ]);

    const data = requests.map((r) => ChangeRequestResponseDto.fromEntity(r));
    return new PaginatedResponseDto(data, total, page, size);
  }

  /**
   * Get all change requests with pagination and filters
   */
  async findAllWithFilters(
    page: number = 0,
    size: number = 50,
    unit?: string,
    status?: ChangeRequestStatus,
  ): Promise<PaginatedResponseDto<ChangeRequestResponseDto>> {
    const skip = page * size;

    // Build where clause
    const conditions: any[] = [];

    // Status filter
    if (status) {
      conditions.push({ status });
    }

    // Unit filter: fromDestination starts with unit code
    if (unit) {
      conditions.push({
        fromDestination: { startsWith: unit, mode: 'insensitive' },
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [requests, total] = await Promise.all([
      this.prisma.wireChangeRequest.findMany({
        where,
        include: { author: true, reviewer: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.wireChangeRequest.count({ where }),
    ]);

    const data = requests.map((r) => ChangeRequestResponseDto.fromEntity(r));
    return new PaginatedResponseDto(data, total, page, size);
  }

  /**
   * Get pending change requests grouped by author
   */
  async findPendingGroupedByAuthor(): Promise<AuthorGroupedChangeRequestsDto[]> {
    return this.findGroupedByAuthor([ChangeRequestStatus.PENDING]);
  }

  /**
   * Get ALL change requests grouped by author (for review history)
   */
  async findAllGroupedByAuthor(): Promise<AuthorGroupedChangeRequestsDto[]> {
    return this.findGroupedByAuthor(); // No status filter = all statuses
  }

  /**
   * Get change requests grouped by author with optional status filter
   */
  private async findGroupedByAuthor(
    statuses?: ChangeRequestStatus[],
  ): Promise<AuthorGroupedChangeRequestsDto[]> {
    const where = statuses && statuses.length > 0 ? { status: { in: statuses } } : {};

    const requests = await this.prisma.wireChangeRequest.findMany({
      where,
      include: { author: true, reviewer: true },
      orderBy: [{ authorId: 'asc' }, { createdAt: 'desc' }],
    });

    // Type for requests with author included
    type RequestWithAuthor = (typeof requests)[number];

    // Group by author
    const groupedMap = new Map<string, RequestWithAuthor[]>();

    for (const request of requests) {
      const authorKey = request.authorId.toString();
      const existing = groupedMap.get(authorKey);
      if (existing) {
        existing.push(request);
      } else {
        groupedMap.set(authorKey, [request]);
      }
    }

    // Convert to response format
    const result: AuthorGroupedChangeRequestsDto[] = [];

    for (const [, authorRequests] of groupedMap) {
      const firstRequest = authorRequests[0];
      const author = firstRequest.author;

      const authorDto: AuthorDto = {
        id: author.id.toString(),
        username: author.username,
        fullName: `${author.firstName || ''} ${author.lastName || ''}`.trim(),
      };

      // Find the most recent update date
      const latestDate = authorRequests.reduce((latest, r) => {
        return r.createdAt > latest ? r.createdAt : latest;
      }, authorRequests[0].createdAt);

      result.push({
        author: authorDto,
        updatedDate: latestDate.toISOString(),
        requests: authorRequests.map((r) => ChangeRequestResponseDto.fromEntity(r)),
        count: authorRequests.length,
      });
    }

    // Sort by most recent first
    result.sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());

    return result;
  }

  /**
   * Get a single change request by ID
   */
  async findOne(id: bigint): Promise<ChangeRequestResponseDto> {
    const request = await this.prisma.wireChangeRequest.findUnique({
      where: { id },
      include: { author: true, reviewer: true },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    return ChangeRequestResponseDto.fromEntity(request);
  }

  /**
   * Approve a change request - apply changes to wireslist
   */
  async approve(id: bigint, reviewer: User, comment?: string): Promise<ChangeRequestResponseDto> {
    this.logger.log(`Approving change request ${id} by ${reviewer.username}`);

    const request = await this.prisma.wireChangeRequest.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(`Change request is not pending (status: ${request.status})`);
    }

    // Apply the change based on request type
    await this.prisma.$transaction(async (tx) => {
      switch (request.requestType) {
        case ChangeRequestType.CREATE:
          await tx.wire.create({
            data: {
              fromDestination: request.fromDestination!,
              toDestination: request.toDestination!,
              wireCodeId: request.wireCodeId,
              colorId: request.colorId,
              ioTypeId: request.ioTypeId,
              sub: request.sub,
              word: request.word,
              bits: request.bits,
              power: request.power,
              origin: request.origin,
              wireNumber: request.wireNumber,
              hwModelsId: request.hwModelsId,
              remarks: request.remarks,
              noteCode: request.noteCode,
              changeNumber: request.changeNumber,
              changeDate: request.changeDate,
              hwAddress: request.hwAddress,
              coord: request.coord,
              decommissioned: request.decommissioned,
              ped: request.ped,
              network: request.network,
            },
          });
          break;

        case ChangeRequestType.UPDATE:
          await tx.wire.update({
            where: { id: request.wireId! },
            data: {
              fromDestination: request.fromDestination ?? undefined,
              toDestination: request.toDestination ?? undefined,
              wireCodeId: request.wireCodeId,
              colorId: request.colorId,
              ioTypeId: request.ioTypeId,
              sub: request.sub,
              word: request.word,
              bits: request.bits,
              power: request.power,
              origin: request.origin,
              wireNumber: request.wireNumber,
              hwModelsId: request.hwModelsId,
              remarks: request.remarks,
              noteCode: request.noteCode,
              changeNumber: request.changeNumber,
              changeDate: request.changeDate,
              hwAddress: request.hwAddress,
              coord: request.coord,
              decommissioned: request.decommissioned,
              ped: request.ped,
              network: request.network,
            },
          });
          break;

        case ChangeRequestType.DELETE:
          await tx.wire.delete({
            where: { id: request.wireId! },
          });
          break;
      }

      // Update the change request status
      await tx.wireChangeRequest.update({
        where: { id },
        data: {
          status: ChangeRequestStatus.APPROVED,
          reviewerId: reviewer.id,
          reviewComment: comment || null,
          reviewedAt: new Date(),
        },
      });
    });

    // Return the updated request
    const updated = await this.prisma.wireChangeRequest.findUnique({
      where: { id },
      include: { author: true, reviewer: true },
    });

    return ChangeRequestResponseDto.fromEntity(updated!);
  }

  /**
   * Decline a change request - mark as declined with optional comment
   */
  async decline(id: bigint, reviewer: User, comment?: string): Promise<ChangeRequestResponseDto> {
    this.logger.log(`Declining change request ${id} by ${reviewer.username}`);

    const request = await this.prisma.wireChangeRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(`Change request is not pending (status: ${request.status})`);
    }

    const updated = await this.prisma.wireChangeRequest.update({
      where: { id },
      data: {
        status: ChangeRequestStatus.DECLINED,
        reviewerId: reviewer.id,
        reviewComment: comment || null,
        reviewedAt: new Date(),
      },
      include: { author: true, reviewer: true },
    });

    return ChangeRequestResponseDto.fromEntity(updated);
  }

  /**
   * Reject/delete a change request completely
   */
  async reject(id: bigint, reviewer: User): Promise<void> {
    this.logger.log(`Rejecting (deleting) change request ${id} by ${reviewer.username}`);

    const request = await this.prisma.wireChangeRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    await this.prisma.wireChangeRequest.delete({
      where: { id },
    });
  }

  /**
   * Approve all pending requests from a specific author
   */
  async approveByAuthor(authorId: bigint, reviewer: User, comment?: string): Promise<number> {
    this.logger.log(`Approving all requests from author ${authorId} by ${reviewer.username}`);

    const requests = await this.prisma.wireChangeRequest.findMany({
      where: {
        authorId,
        status: ChangeRequestStatus.PENDING,
      },
    });

    let approvedCount = 0;

    for (const request of requests) {
      try {
        await this.approve(request.id, reviewer, comment);
        approvedCount++;
      } catch (error) {
        this.logger.error(`Failed to approve request ${request.id}: ${error}`);
      }
    }

    return approvedCount;
  }

  /**
   * Decline all pending requests from a specific author
   */
  async declineByAuthor(authorId: bigint, reviewer: User, comment?: string): Promise<number> {
    this.logger.log(`Declining all requests from author ${authorId} by ${reviewer.username}`);

    const result = await this.prisma.wireChangeRequest.updateMany({
      where: {
        authorId,
        status: ChangeRequestStatus.PENDING,
      },
      data: {
        status: ChangeRequestStatus.DECLINED,
        reviewerId: reviewer.id,
        reviewComment: comment || null,
        reviewedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Reject all pending requests from a specific author
   */
  async rejectByAuthor(authorId: bigint, reviewer: User): Promise<number> {
    this.logger.log(`Rejecting all requests from author ${authorId} by ${reviewer.username}`);

    const result = await this.prisma.wireChangeRequest.deleteMany({
      where: {
        authorId,
        status: ChangeRequestStatus.PENDING,
      },
    });

    return result.count;
  }
}
