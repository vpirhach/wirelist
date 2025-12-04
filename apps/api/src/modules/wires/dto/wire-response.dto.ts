import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Wire, WireChangeRequest, User, ChangeRequestStatus } from '@prisma/client';
import { FieldChange } from '../../change-requests/dto/create-change-request.dto';

/**
 * Represents a change request update for a wire (pending or approved)
 */
export class WireUpdateDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  updatedDate: string;

  @ApiProperty({ enum: ChangeRequestStatus, description: 'Status of the change request' })
  status: ChangeRequestStatus;

  @ApiProperty({ description: 'Changes with old and new values' })
  changes: Record<string, FieldChange>;

  @ApiPropertyOptional()
  authorId?: string;

  @ApiPropertyOptional()
  authorName?: string;

  @ApiPropertyOptional({ description: 'Review comment from the approver/decliner' })
  reviewComment?: string;
}

export class WireResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fromDestination: string;

  @ApiProperty()
  toDestination: string;

  @ApiPropertyOptional()
  wireCodeId?: number;

  @ApiPropertyOptional()
  colorId?: number;

  @ApiPropertyOptional()
  ioTypeId?: string;

  @ApiPropertyOptional()
  sub?: number;

  @ApiPropertyOptional()
  word?: number;

  @ApiPropertyOptional()
  bits?: number;

  @ApiPropertyOptional()
  power?: string;

  @ApiPropertyOptional()
  origin?: string;

  @ApiPropertyOptional()
  wireNumber?: string;

  @ApiPropertyOptional()
  hwModelsId?: number;

  @ApiPropertyOptional()
  remarks?: string;

  @ApiPropertyOptional()
  noteCode?: string;

  @ApiPropertyOptional()
  changeNumber?: string;

  @ApiPropertyOptional()
  changeDate?: Date;

  @ApiPropertyOptional()
  hwAddress?: string;

  @ApiPropertyOptional()
  coord?: string;

  @ApiPropertyOptional()
  decommissioned?: string;

  @ApiPropertyOptional()
  ped?: string;

  @ApiPropertyOptional()
  network?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({
    type: [WireUpdateDto],
    description: 'Change requests for this wire (pending or approved)',
  })
  updates?: WireUpdateDto[];

  static fromEntity(
    wire: Wire,
    changeRequests?: (WireChangeRequest & { author?: User })[],
  ): WireResponseDto {
    return {
      id: wire.id.toString(),
      fromDestination: wire.fromDestination,
      toDestination: wire.toDestination,
      wireCodeId: wire.wireCodeId ?? undefined,
      colorId: wire.colorId ?? undefined,
      ioTypeId: wire.ioTypeId ?? undefined,
      sub: wire.sub ?? undefined,
      word: wire.word ?? undefined,
      bits: wire.bits ?? undefined,
      power: wire.power ?? undefined,
      origin: wire.origin ?? undefined,
      wireNumber: wire.wireNumber ?? undefined,
      hwModelsId: wire.hwModelsId ?? undefined,
      remarks: wire.remarks ?? undefined,
      noteCode: wire.noteCode ?? undefined,
      changeNumber: wire.changeNumber ?? undefined,
      changeDate: wire.changeDate ?? undefined,
      hwAddress: wire.hwAddress ?? undefined,
      coord: wire.coord ?? undefined,
      decommissioned: wire.decommissioned ?? undefined,
      ped: wire.ped ?? undefined,
      network: wire.network ?? undefined,
      createdAt: wire.createdAt || new Date(),
      updatedAt: wire.updatedAt || new Date(),
      updates: changeRequests?.map((cr) => ({
        id: cr.id.toString(),
        updatedDate: cr.createdAt.toISOString(),
        status: cr.status,
        changes: (cr.changes as unknown as Record<string, FieldChange>) || {},
        authorId: cr.authorId?.toString(),
        authorName: cr.author
          ? `${cr.author.firstName || ''} ${cr.author.lastName || ''}`.trim()
          : undefined,
        reviewComment: cr.reviewComment ?? undefined,
      })),
    };
  }
}
