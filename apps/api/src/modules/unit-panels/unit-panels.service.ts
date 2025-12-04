import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UnitPanelsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Extract unit code from fromDestination (first 2 characters)
   */
  private extractUnitCode(fromDestination: string | null): string | null {
    if (!fromDestination || fromDestination.length < 2) {
      return null;
    }
    return fromDestination.substring(0, 2);
  }

  /**
   * Extract panel code from fromDestination (characters 3-7)
   */
  private extractPanelCode(fromDestination: string | null): string | null {
    if (!fromDestination || fromDestination.length < 7) {
      return null;
    }
    return fromDestination.substring(2, 7);
  }

  /**
   * Check if string contains only numeric characters
   */
  private isNumericOnly(code: string | null): boolean {
    if (!code || code.length === 0) {
      return false;
    }
    return /^\d+$/.test(code);
  }

  /**
   * Natural sort comparator for numeric strings
   * "2" comes before "10", "02" equals "2"
   */
  private naturalOrderCompare(a: string, b: string): number {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    if (!isNaN(numA)) return -1; // numbers first
    if (!isNaN(numB)) return 1;
    return a.localeCompare(b);
  }

  /**
   * Get all unique unit codes from wire data
   * Filters to numeric-only codes and sorts naturally
   */
  async getAllUnitCodes(): Promise<string[]> {
    const wires = await this.prisma.wire.findMany({
      select: { fromDestination: true },
    });

    const unitCodes = new Set<string>();

    for (const wire of wires) {
      const code = this.extractUnitCode(wire.fromDestination);
      if (code && this.isNumericOnly(code)) {
        unitCodes.add(code);
      }
    }

    return Array.from(unitCodes).sort(this.naturalOrderCompare);
  }

  /**
   * Get all unique panel codes from wire data
   */
  async getAllPanelCodes(): Promise<string[]> {
    const wires = await this.prisma.wire.findMany({
      select: { fromDestination: true },
    });

    const panelCodes = new Set<string>();

    for (const wire of wires) {
      const code = this.extractPanelCode(wire.fromDestination);
      if (code && code.length > 0) {
        panelCodes.add(code);
      }
    }

    return Array.from(panelCodes).sort();
  }

  /**
   * Get panel codes for a specific unit
   */
  async getPanelCodesByUnit(unitCode: string): Promise<string[]> {
    const wires = await this.prisma.wire.findMany({
      select: { fromDestination: true },
      where: {
        fromDestination: {
          startsWith: unitCode,
        },
      },
    });

    const panelCodes = new Set<string>();

    for (const wire of wires) {
      const code = this.extractPanelCode(wire.fromDestination);
      if (code && code.length > 0) {
        panelCodes.add(code);
      }
    }

    return Array.from(panelCodes).sort();
  }
}

