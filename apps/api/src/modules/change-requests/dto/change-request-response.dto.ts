import { ApiProperty } from '@nestjs/swagger';
import { WireChangeRequest, User } from '@prisma/client';
import { FieldChange } from './create-change-request.dto';

export class AuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  fullName: string;
}

export class ChangeRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  wireId: string | null;

  @ApiProperty()
  requestType: string;

  @ApiProperty()
  status: string;

  // Wire data fields
  @ApiProperty()
  fromDestination: string | null;

  @ApiProperty()
  toDestination: string | null;

  @ApiProperty()
  wireCodeId: number | null;

  @ApiProperty()
  colorId: number | null;

  @ApiProperty()
  ioTypeId: string | null;

  @ApiProperty()
  sub: number | null;

  @ApiProperty()
  word: number | null;

  @ApiProperty()
  bits: number | null;

  @ApiProperty()
  power: string | null;

  @ApiProperty()
  origin: string | null;

  @ApiProperty()
  wireNumber: string | null;

  @ApiProperty()
  hwModelsId: number | null;

  @ApiProperty()
  remarks: string | null;

  @ApiProperty()
  noteCode: string | null;

  @ApiProperty()
  changeNumber: string | null;

  @ApiProperty()
  changeDate: string | null;

  @ApiProperty()
  hwAddress: string | null;

  @ApiProperty()
  coord: string | null;

  @ApiProperty()
  decommissioned: string | null;

  @ApiProperty()
  ped: string | null;

  @ApiProperty()
  network: string | null;

  // Changes tracking (old → new values)
  @ApiProperty({ description: 'Changes with old and new values' })
  changes: Record<string, FieldChange> | null;

  // Batch grouping
  @ApiProperty({ description: 'Batch ID for grouping requests created together' })
  batchId: string | null;

  // Metadata
  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  @ApiProperty()
  reviewComment: string | null;

  @ApiProperty()
  reviewedAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  static fromEntity(
    entity: WireChangeRequest & { author: User; reviewer?: User | null },
  ): ChangeRequestResponseDto {
    return {
      id: entity.id.toString(),
      wireId: entity.wireId?.toString() ?? null,
      requestType: entity.requestType,
      status: entity.status,
      fromDestination: entity.fromDestination,
      toDestination: entity.toDestination,
      wireCodeId: entity.wireCodeId,
      colorId: entity.colorId,
      ioTypeId: entity.ioTypeId,
      sub: entity.sub,
      word: entity.word,
      bits: entity.bits,
      power: entity.power,
      origin: entity.origin,
      wireNumber: entity.wireNumber,
      hwModelsId: entity.hwModelsId,
      remarks: entity.remarks,
      noteCode: entity.noteCode,
      changeNumber: entity.changeNumber,
      changeDate: entity.changeDate?.toISOString() ?? null,
      hwAddress: entity.hwAddress,
      coord: entity.coord,
      decommissioned: entity.decommissioned,
      ped: entity.ped,
      network: entity.network,
      changes: entity.changes as Record<string, FieldChange> | null,
      batchId: entity.batchId ?? null,
      author: {
        id: entity.author.id.toString(),
        username: entity.author.username,
        fullName: `${entity.author.firstName || ''} ${entity.author.lastName || ''}`.trim(),
      },
      reviewComment: entity.reviewComment,
      reviewedAt: entity.reviewedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

/**
 * Change requests grouped by author for the review page
 */
export class AuthorGroupedChangeRequestsDto {
  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  @ApiProperty()
  updatedDate: string;

  @ApiProperty({ type: [ChangeRequestResponseDto] })
  requests: ChangeRequestResponseDto[];

  @ApiProperty()
  count: number;
}
