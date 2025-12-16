import { ApiProperty } from '@nestjs/swagger';
import { WireChangeRecord } from '@prisma/client';
import { FieldChange } from './create-change-record.dto';

export class ChangeRecordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  wireId: string | null;

  @ApiProperty()
  recordType: string;

  @ApiProperty()
  changeRequestId: string;

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

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  static fromEntity(entity: WireChangeRecord): ChangeRecordResponseDto {
    return {
      id: entity.id.toString(),
      wireId: entity.wireId?.toString() ?? null,
      recordType: entity.recordType,
      changeRequestId: entity.changeRequestId.toString(),
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
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

