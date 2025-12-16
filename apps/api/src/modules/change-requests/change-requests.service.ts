import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User, ChangeRequestStatus, ChangeRecordType, Prisma } from '@prisma/client';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { CreateChangeRecordDto } from './dto/create-change-record.dto';
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
   * Create a change request with multiple change records
   */
  async create(dto: CreateChangeRequestDto, author: User): Promise<ChangeRequestResponseDto> {
    if (!dto.records || !Array.isArray(dto.records) || dto.records.length === 0) {
      throw new BadRequestException('At least one change record is required');
    }

    this.logger.log(
      `Creating change request with ${dto.records.length} records by ${author.username}`,
    );

    // Validate each record
    for (const record of dto.records) {
      this.validateChangeRecord(record);
    }

    // Create the change request with all records in a transaction
    const changeRequest = await this.prisma.$transaction(async (tx) => {
      // Create the change request
      const request = await tx.changeRequest.create({
        data: {
          comment: dto.comment || null,
          authorId: author.id,
          status: ChangeRequestStatus.PENDING,
        },
      });

      // Create all change records
      for (const recordDto of dto.records) {
        await tx.wireChangeRecord.create({
          data: {
            changeRequestId: request.id,
            wireId: recordDto.wireId ? BigInt(recordDto.wireId) : null,
            recordType: recordDto.recordType as ChangeRecordType,
            fromDestination: recordDto.fromDestination,
            toDestination: recordDto.toDestination,
            wireCodeId: recordDto.wireCodeId,
            colorId: recordDto.colorId,
            ioTypeId: recordDto.ioTypeId,
            sub: recordDto.sub,
            word: recordDto.word,
            bits: recordDto.bits,
            power: recordDto.power,
            origin: recordDto.origin,
            wireNumber: recordDto.wireNumber,
            hwModelsId: recordDto.hwModelsId,
            remarks: recordDto.remarks,
            noteCode: recordDto.noteCode,
            changeNumber: recordDto.changeNumber,
            changeDate: recordDto.changeDate ? new Date(recordDto.changeDate) : null,
            hwAddress: recordDto.hwAddress,
            coord: recordDto.coord,
            decommissioned: recordDto.decommissioned,
            ped: recordDto.ped,
            network: recordDto.network,
            changes: recordDto.changes ? (recordDto.changes as any) : Prisma.DbNull,
          },
        });
      }

      return request;
    });

    // Fetch the complete request with relations
    const result = await this.prisma.changeRequest.findUnique({
      where: { id: changeRequest.id },
      include: { author: true, reviewer: true, records: true },
    });

    return ChangeRequestResponseDto.fromEntity(result!);
  }

  /**
   * Validate a change record DTO
   */
  private validateChangeRecord(dto: CreateChangeRecordDto): void {
    // Validate: UPDATE and DELETE must have wireId
    if ((dto.recordType === 'UPDATE' || dto.recordType === 'DELETE') && !dto.wireId) {
      throw new BadRequestException(`wireId is required for ${dto.recordType} records`);
    }

    // Validate: CREATE must not have wireId
    if (dto.recordType === 'CREATE' && dto.wireId) {
      throw new BadRequestException('wireId should not be provided for CREATE records');
    }
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
      this.prisma.changeRequest.findMany({
        where: { status: ChangeRequestStatus.PENDING },
        include: { author: true, reviewer: true, records: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.changeRequest.count({
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

    // Unit filter: filter requests that have records with fromDestination starting with unit code
    if (unit) {
      conditions.push({
        records: {
          some: {
            fromDestination: { startsWith: unit, mode: 'insensitive' },
          },
        },
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [requests, total] = await Promise.all([
      this.prisma.changeRequest.findMany({
        where,
        include: { author: true, reviewer: true, records: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.changeRequest.count({ where }),
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

    const requests = await this.prisma.changeRequest.findMany({
      where,
      include: { author: true, reviewer: true, records: true },
      orderBy: [{ authorId: 'asc' }, { createdAt: 'desc' }],
    });

    // Type for requests with relations included
    type RequestWithRelations = (typeof requests)[number];

    // Group by author
    const groupedMap = new Map<string, RequestWithRelations[]>();

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

      // Count total records across all requests
      const totalRecords = authorRequests.reduce((sum, r) => sum + r.records.length, 0);

      result.push({
        author: authorDto,
        updatedDate: latestDate.toISOString(),
        requests: authorRequests.map((r) => ChangeRequestResponseDto.fromEntity(r)),
        count: authorRequests.length,
        totalRecords,
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
    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: { author: true, reviewer: true, records: true },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    return ChangeRequestResponseDto.fromEntity(request);
  }

  /**
   * Approve a change request - apply all records to wireslist
   */
  async approve(id: bigint, reviewer: User, comment?: string): Promise<ChangeRequestResponseDto> {
    this.logger.log(`Approving change request ${id} by ${reviewer.username}`);

    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: { author: true, records: true },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(`Change request is not pending (status: ${request.status})`);
    }

    // Apply all change records in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const record of request.records) {
        switch (record.recordType) {
          case ChangeRecordType.CREATE:
            await tx.wire.create({
              data: {
                fromDestination: record.fromDestination!,
                toDestination: record.toDestination!,
                wireCodeId: record.wireCodeId,
                colorId: record.colorId,
                ioTypeId: record.ioTypeId,
                sub: record.sub,
                word: record.word,
                bits: record.bits,
                power: record.power,
                origin: record.origin,
                wireNumber: record.wireNumber,
                hwModelsId: record.hwModelsId,
                remarks: record.remarks,
                noteCode: record.noteCode,
                changeNumber: record.changeNumber,
                changeDate: record.changeDate,
                hwAddress: record.hwAddress,
                coord: record.coord,
                decommissioned: record.decommissioned,
                ped: record.ped,
                network: record.network,
              },
            });
            break;

          case ChangeRecordType.UPDATE:
            await tx.wire.update({
              where: { id: record.wireId! },
              data: {
                fromDestination: record.fromDestination ?? undefined,
                toDestination: record.toDestination ?? undefined,
                wireCodeId: record.wireCodeId,
                colorId: record.colorId,
                ioTypeId: record.ioTypeId,
                sub: record.sub,
                word: record.word,
                bits: record.bits,
                power: record.power,
                origin: record.origin,
                wireNumber: record.wireNumber,
                hwModelsId: record.hwModelsId,
                remarks: record.remarks,
                noteCode: record.noteCode,
                changeNumber: record.changeNumber,
                changeDate: record.changeDate,
                hwAddress: record.hwAddress,
                coord: record.coord,
                decommissioned: record.decommissioned,
                ped: record.ped,
                network: record.network,
              },
            });
            break;

          case ChangeRecordType.DELETE:
            await tx.wire.delete({
              where: { id: record.wireId! },
            });
            break;
        }
      }

      // Update the change request status
      await tx.changeRequest.update({
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
    const updated = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: { author: true, reviewer: true, records: true },
    });

    return ChangeRequestResponseDto.fromEntity(updated!);
  }

  /**
   * Decline a change request - mark as declined with optional comment
   */
  async decline(id: bigint, reviewer: User, comment?: string): Promise<ChangeRequestResponseDto> {
    this.logger.log(`Declining change request ${id} by ${reviewer.username}`);

    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(`Change request is not pending (status: ${request.status})`);
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: {
        status: ChangeRequestStatus.DECLINED,
        reviewerId: reviewer.id,
        reviewComment: comment || null,
        reviewedAt: new Date(),
      },
      include: { author: true, reviewer: true, records: true },
    });

    return ChangeRequestResponseDto.fromEntity(updated);
  }

  /**
   * Reject/delete a change request completely
   */
  async reject(id: bigint, reviewer: User): Promise<void> {
    this.logger.log(`Rejecting (deleting) change request ${id} by ${reviewer.username}`);

    const request = await this.prisma.changeRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    // Records will be deleted automatically due to onDelete: Cascade
    await this.prisma.changeRequest.delete({
      where: { id },
    });
  }

  /**
   * Approve all pending requests from a specific author
   */
  async approveByAuthor(authorId: bigint, reviewer: User, comment?: string): Promise<number> {
    this.logger.log(`Approving all requests from author ${authorId} by ${reviewer.username}`);

    const requests = await this.prisma.changeRequest.findMany({
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

    const result = await this.prisma.changeRequest.updateMany({
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

    const result = await this.prisma.changeRequest.deleteMany({
      where: {
        authorId,
        status: ChangeRequestStatus.PENDING,
      },
    });

    return result.count;
  }
}
