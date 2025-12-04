import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base pagination query DTO for requests
 */
export class PaginationDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 30;
}

/**
 * Internal paginated response (used by services)
 */
export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;

  constructor(data: T[], total: number, page: number, size: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.size = size;
    this.totalPages = Math.ceil(total / size);
  }
}

/**
 * Generic Page Response DTO (matches Spring Boot's Page<T> format)
 * Use this as a base for typed paginated responses
 */
export class PageResponseDto<T> {
  @ApiProperty({ description: 'Array of items in this page' })
  content: T[];

  @ApiProperty({ description: 'Total number of elements across all pages' })
  totalElements: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Current page number (0-based)' })
  number: number;

  @ApiProperty({ description: 'Page size' })
  size: number;

  @ApiProperty({ description: 'Whether this is the first page' })
  first: boolean;

  @ApiProperty({ description: 'Whether this is the last page' })
  last: boolean;

  @ApiProperty({ description: 'Number of elements in this page' })
  numberOfElements: number;

  /**
   * Create a PageResponseDto from PaginatedResponseDto with a mapper function
   */
  static from<T, R>(result: PaginatedResponseDto<T>, mapper: (item: T) => R): PageResponseDto<R> {
    return {
      content: result.data.map(mapper),
      totalElements: result.total,
      totalPages: result.totalPages,
      number: result.page,
      size: result.size,
      first: result.page === 0,
      last: result.page >= result.totalPages - 1,
      numberOfElements: result.data.length,
    };
  }

  /**
   * Create a PageResponseDto from PaginatedResponseDto (no mapping)
   */
  static fromRaw<T>(result: PaginatedResponseDto<T>): PageResponseDto<T> {
    return {
      content: result.data,
      totalElements: result.total,
      totalPages: result.totalPages,
      number: result.page,
      size: result.size,
      first: result.page === 0,
      last: result.page >= result.totalPages - 1,
      numberOfElements: result.data.length,
    };
  }
}
