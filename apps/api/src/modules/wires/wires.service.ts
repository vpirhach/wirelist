import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Wire, User, WireChangeRecord, ChangeRequest, ChangeRequestStatus } from '@prisma/client';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { GetWiresDto } from './dto/get-wires.dto';
import { CreateWireDto } from './dto/create-wire.dto';
import { UpdateWireDto } from './dto/update-wire.dto';
import { SearchWiresDto } from './dto/search-wires.dto';
import { UnitSummaryDto } from './dto/unit-summary.dto';
import { isCommand, executeCommand } from '../../common/utils/command-parser';

/**
 * Extended wire type that includes pending change records
 */
export type WireWithPendingUpdates = Wire & {
  pendingChangeRecords?: (WireChangeRecord & { changeRequest: ChangeRequest & { author: User } })[];
};

@Injectable()
export class WiresService {
  private readonly logger = new Logger(WiresService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all wires with pagination and optional filters
   * Includes pending change requests for each wire
   */
  async findAll(dto: GetWiresDto): Promise<PaginatedResponseDto<WireWithPendingUpdates>> {
    const { page = 0, size = 30, unit, panel } = dto;
    const skip = page * size;

    // Build where clause based on filters
    const conditions: any[] = [];

    // Unit filter: fromDestination starts with unit code
    if (unit) {
      conditions.push({ fromDestination: { startsWith: unit, mode: 'insensitive' } });
    }

    // Panel filter: fromDestination or toDestination contains panel code
    if (panel) {
      conditions.push({
        OR: [
          { fromDestination: { contains: panel, mode: 'insensitive' } },
          { toDestination: { contains: panel, mode: 'insensitive' } },
        ],
      });
    }

    // Combine all conditions with AND
    const where = conditions.length > 0 ? { AND: conditions } : {};

    // Execute query with pagination
    const [wires, total] = await Promise.all([
      this.prisma.wire.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ fromDestination: 'asc' }, { toDestination: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.wire.count({ where }),
    ]);

    // Fetch pending and approved change records for these wires
    const wireIds = wires.map((w) => w.id);
    const changeRecords = await this.prisma.wireChangeRecord.findMany({
      where: {
        wireId: { in: wireIds },
        changeRequest: {
          status: { in: [ChangeRequestStatus.PENDING, ChangeRequestStatus.APPROVED] },
        },
      },
      include: { changeRequest: { include: { author: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group change records by wireId
    type ChangeRecordWithRequest = WireChangeRecord & { changeRequest: ChangeRequest & { author: User } };
    const changeRecordsByWireId = new Map<bigint, ChangeRecordWithRequest[]>();
    for (const cr of changeRecords) {
      if (cr.wireId) {
        if (!changeRecordsByWireId.has(cr.wireId)) {
          changeRecordsByWireId.set(cr.wireId, []);
        }
        changeRecordsByWireId.get(cr.wireId)!.push(cr);
      }
    }

    // Merge wires with their change records
    const wiresWithUpdates: WireWithPendingUpdates[] = wires.map((wire) => ({
      ...wire,
      pendingChangeRecords: changeRecordsByWireId.get(wire.id) || [],
    }));

    return new PaginatedResponseDto(wiresWithUpdates, total, page, size);
  }

  /**
   * Get wire by ID
   */
  async findOne(id: bigint): Promise<Wire | null> {
    return this.prisma.wire.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new wire
   */
  async create(dto: CreateWireDto, user: User): Promise<Wire> {
    this.logger.log(`Creating new wire by user: ${user.username}`);

    const wire = await this.prisma.wire.create({
      data: {
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
      },
    });

    // Create audit record
    await this.createAuditRecord(wire, 'CREATE', user);

    this.logger.log(`Wire created with ID: ${wire.id}`);
    return wire;
  }

  /**
   * Update an existing wire
   */
  async update(id: bigint, dto: UpdateWireDto, user: User): Promise<Wire> {
    this.logger.log(`Updating wire ${id} by user: ${user.username}`);

    // Check if wire exists
    const existingWire = await this.prisma.wire.findUnique({
      where: { id },
    });

    if (!existingWire) {
      throw new NotFoundException(`Wire with ID ${id} not found`);
    }

    const wire = await this.prisma.wire.update({
      where: { id },
      data: {
        fromDestination: dto.fromDestination ?? existingWire.fromDestination,
        toDestination: dto.toDestination ?? existingWire.toDestination,
        wireCodeId: dto.wireCodeId !== undefined ? dto.wireCodeId : existingWire.wireCodeId,
        colorId: dto.colorId !== undefined ? dto.colorId : existingWire.colorId,
        ioTypeId: dto.ioTypeId !== undefined ? dto.ioTypeId : existingWire.ioTypeId,
        sub: dto.sub !== undefined ? dto.sub : existingWire.sub,
        word: dto.word !== undefined ? dto.word : existingWire.word,
        bits: dto.bits !== undefined ? dto.bits : existingWire.bits,
        power: dto.power !== undefined ? dto.power : existingWire.power,
        origin: dto.origin !== undefined ? dto.origin : existingWire.origin,
        wireNumber: dto.wireNumber !== undefined ? dto.wireNumber : existingWire.wireNumber,
        hwModelsId: dto.hwModelsId !== undefined ? dto.hwModelsId : existingWire.hwModelsId,
        remarks: dto.remarks !== undefined ? dto.remarks : existingWire.remarks,
        noteCode: dto.noteCode !== undefined ? dto.noteCode : existingWire.noteCode,
        changeNumber: dto.changeNumber !== undefined ? dto.changeNumber : existingWire.changeNumber,
        changeDate:
          dto.changeDate !== undefined ? new Date(dto.changeDate) : existingWire.changeDate,
        hwAddress: dto.hwAddress !== undefined ? dto.hwAddress : existingWire.hwAddress,
        coord: dto.coord !== undefined ? dto.coord : existingWire.coord,
        decommissioned:
          dto.decommissioned !== undefined ? dto.decommissioned : existingWire.decommissioned,
        ped: dto.ped !== undefined ? dto.ped : existingWire.ped,
        network: dto.network !== undefined ? dto.network : existingWire.network,
      },
    });

    // Create audit record
    await this.createAuditRecord(wire, 'UPDATE', user);

    this.logger.log(`Wire ${id} updated successfully`);
    return wire;
  }

  /**
   * Delete a wire
   */
  async delete(id: bigint, user: User): Promise<void> {
    this.logger.log(`Deleting wire ${id} by user: ${user.username}`);

    // Check if wire exists
    const existingWire = await this.prisma.wire.findUnique({
      where: { id },
    });

    if (!existingWire) {
      throw new NotFoundException(`Wire with ID ${id} not found`);
    }

    // Create audit record before deletion
    await this.createAuditRecord(existingWire, 'DELETE', user);

    await this.prisma.wire.delete({
      where: { id },
    });

    this.logger.log(`Wire ${id} deleted successfully`);
  }

  /**
   * Delete all wires (Admin/Dev only)
   */
  async deleteAll(user: User): Promise<{ deletedCount: number }> {
    this.logger.warn(`DELETE ALL WIRES requested by user: ${user.username}`);

    const count = await this.prisma.wire.count();
    await this.prisma.wire.deleteMany({});

    this.logger.warn(`Deleted ${count} wires`);
    return { deletedCount: count };
  }

  /**
   * Search wires by keyword or command
   * Supports commands like: /address sub word bits
   * Includes pending change requests for each wire
   */
  async search(dto: SearchWiresDto): Promise<PaginatedResponseDto<WireWithPendingUpdates>> {
    const { keyword, unit, page = 0, size = 10 } = dto;
    const skip = page * size;

    let where: any = {};

    // Check if keyword is a command (starts with '/')
    if (isCommand(keyword)) {
      const commandResult = executeCommand(keyword);

      if (commandResult?.type === 'address') {
        // Build address search conditions
        const conditions: any[] = [];

        if (commandResult.sub !== undefined) {
          conditions.push({ sub: commandResult.sub });
        }
        if (commandResult.word !== undefined) {
          conditions.push({ word: commandResult.word });
        }
        if (commandResult.bits !== undefined) {
          conditions.push({ bits: commandResult.bits });
        }

        // Add unit filter if provided
        if (unit) {
          conditions.push({
            OR: { fromDestination: { startsWith: unit, mode: 'insensitive' } },
          });
        }

        where = conditions.length > 0 ? { AND: conditions } : {};

        this.logger.debug(
          `Address command search: sub=${commandResult.sub}, word=${commandResult.word}, bits=${commandResult.bits}`,
        );
      }
      // Future commands can be added here
    } else {
      // Regular keyword search
      const searchConditions = [
        { fromDestination: { contains: keyword, mode: 'insensitive' as const } },
        { toDestination: { contains: keyword, mode: 'insensitive' as const } },
        { remarks: { contains: keyword, mode: 'insensitive' as const } },
        { wireNumber: { contains: keyword, mode: 'insensitive' as const } },
        { noteCode: { contains: keyword, mode: 'insensitive' as const } },
        { hwAddress: { contains: keyword, mode: 'insensitive' as const } },
        { ioTypeId: { contains: keyword, mode: 'insensitive' as const } },
        { power: { contains: keyword, mode: 'insensitive' as const } },
        { origin: { contains: keyword, mode: 'insensitive' as const } },
        { network: { contains: keyword, mode: 'insensitive' as const } },
      ];

      where = { OR: searchConditions };

      // Add unit filter if provided
      if (unit) {
        where = {
          AND: [
            { OR: searchConditions },
            {
              fromDestination: { startsWith: unit, mode: 'insensitive' },
            },
          ],
        };
      }
    }

    const [wires, total] = await Promise.all([
      this.prisma.wire.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ fromDestination: 'asc' }, { toDestination: 'asc' }],
      }),
      this.prisma.wire.count({ where }),
    ]);

    // Fetch pending and approved change records for these wires
    const wireIds = wires.map((w) => w.id);
    const changeRecords = await this.prisma.wireChangeRecord.findMany({
      where: {
        wireId: { in: wireIds },
        changeRequest: {
          status: { in: [ChangeRequestStatus.PENDING, ChangeRequestStatus.APPROVED] },
        },
      },
      include: { changeRequest: { include: { author: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group change records by wireId
    type ChangeRecordWithRequest = WireChangeRecord & { changeRequest: ChangeRequest & { author: User } };
    const changeRecordsByWireId = new Map<bigint, ChangeRecordWithRequest[]>();
    for (const cr of changeRecords) {
      if (cr.wireId) {
        if (!changeRecordsByWireId.has(cr.wireId)) {
          changeRecordsByWireId.set(cr.wireId, []);
        }
        changeRecordsByWireId.get(cr.wireId)!.push(cr);
      }
    }

    // Merge wires with their change records
    const wiresWithUpdates: WireWithPendingUpdates[] = wires.map((wire) => ({
      ...wire,
      pendingChangeRecords: changeRecordsByWireId.get(wire.id) || [],
    }));

    return new PaginatedResponseDto(wiresWithUpdates, total, page, size);
  }

  /**
   * Get unit summary with panel counts
   */
  async getUnitSummary(): Promise<UnitSummaryDto[]> {
    const wires = await this.prisma.wire.findMany({
      select: {
        fromDestination: true,
        toDestination: true,
      },
    });

    const unitMap = new Map<string, { count: number; panels: Set<string> }>();

    wires.forEach((wire) => {
      // Extract unit and panel from destinations
      const fromParts = wire.fromDestination.split('-');
      const toParts = wire.toDestination.split('-');

      const fromUnit = fromParts[0];
      const toUnit = toParts[0];
      const fromPanel = fromParts.length > 1 ? `${fromParts[0]}-${fromParts[1]}` : fromParts[0];
      const toPanel = toParts.length > 1 ? `${toParts[0]}-${toParts[1]}` : toParts[0];

      // Add to from unit
      if (!unitMap.has(fromUnit)) {
        unitMap.set(fromUnit, { count: 0, panels: new Set() });
      }
      const fromData = unitMap.get(fromUnit)!;
      fromData.count++;
      fromData.panels.add(fromPanel);

      // Add to to unit if different
      if (fromUnit !== toUnit) {
        if (!unitMap.has(toUnit)) {
          unitMap.set(toUnit, { count: 0, panels: new Set() });
        }
        const toData = unitMap.get(toUnit)!;
        toData.count++;
        toData.panels.add(toPanel);
      }
    });

    // Convert to array and sort
    const result: UnitSummaryDto[] = Array.from(unitMap.entries())
      .map(([unit, data]) => ({
        unit,
        count: data.count,
        panels: Array.from(data.panels).sort(),
      }))
      .sort((a, b) => a.unit.localeCompare(b.unit));

    return result;
  }

  /**
   * Get basic summary statistics
   */
  async getSummary(): Promise<{
    total: number;
    byUnit: Record<string, number>;
  }> {
    const total = await this.prisma.wire.count();

    // Get all wires to calculate unit summary
    const wires = await this.prisma.wire.findMany({
      select: {
        fromDestination: true,
        toDestination: true,
      },
    });

    const byUnit: Record<string, number> = {};

    wires.forEach((wire) => {
      // Extract unit code (first part before '-')
      const fromUnit = wire.fromDestination.split('-')[0];
      const toUnit = wire.toDestination.split('-')[0];

      byUnit[fromUnit] = (byUnit[fromUnit] || 0) + 1;
      if (fromUnit !== toUnit) {
        byUnit[toUnit] = (byUnit[toUnit] || 0) + 1;
      }
    });

    return { total, byUnit };
  }

  /**
   * Create audit record for wire operations
   */
  private async createAuditRecord(wire: Wire, auditType: string, user: User): Promise<void> {
    try {
      await this.prisma.wireslist_audit.create({
        data: {
          wire_id: wire.id,
          from_destination: wire.fromDestination,
          to_destination: wire.toDestination,
          wire_code_id: wire.wireCodeId,
          color_id: wire.colorId,
          io_type_id: wire.ioTypeId,
          sub: wire.sub,
          word: wire.word,
          bits: wire.bits,
          power: wire.power,
          origin: wire.origin,
          wire_number: wire.wireNumber,
          hw_models_id: wire.hwModelsId,
          remarks: wire.remarks,
          note_code: wire.noteCode,
          change_number: wire.changeNumber,
          change_date: wire.changeDate,
          hw_address: wire.hwAddress,
          coord: wire.coord,
          decommissioned: wire.decommissioned,
          ped: wire.ped,
          network: wire.network,
          audit_type: auditType,
          author_id: user.id,
        },
      });
      this.logger.debug(`Audit record created for wire ${wire.id}: ${auditType}`);
    } catch (error) {
      this.logger.error(`Failed to create audit record: ${error}`);
      // Don't throw - audit failure shouldn't break the main operation
    }
  }
}
