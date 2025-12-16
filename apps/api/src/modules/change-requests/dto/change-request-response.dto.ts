import { ApiProperty } from '@nestjs/swagger';
import { ChangeRequest, User, WireChangeRecord } from '@prisma/client';
import { ChangeRecordResponseDto } from './change-record-response.dto';

export class AuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  fullName: string;
}

export class ReviewerDto {
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
  status: string;

  @ApiProperty({ description: 'Author comment when submitting the request' })
  comment: string | null;

  // Author info
  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  // Review info
  @ApiProperty({ type: ReviewerDto, nullable: true })
  reviewer: ReviewerDto | null;

  @ApiProperty()
  reviewComment: string | null;

  @ApiProperty()
  reviewedAt: string | null;

  // Timestamps
  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  // Related change records
  @ApiProperty({ type: [ChangeRecordResponseDto] })
  records: ChangeRecordResponseDto[];

  @ApiProperty()
  recordCount: number;

  static fromEntity(
    entity: ChangeRequest & { 
      author: User; 
      reviewer?: User | null;
      records?: WireChangeRecord[];
    },
  ): ChangeRequestResponseDto {
    const author: AuthorDto = {
      id: entity.author.id.toString(),
      username: entity.author.username,
      fullName: `${entity.author.firstName || ''} ${entity.author.lastName || ''}`.trim(),
    };

    const reviewer: ReviewerDto | null = entity.reviewer
      ? {
          id: entity.reviewer.id.toString(),
          username: entity.reviewer.username,
          fullName: `${entity.reviewer.firstName || ''} ${entity.reviewer.lastName || ''}`.trim(),
        }
      : null;

    const records = entity.records?.map(ChangeRecordResponseDto.fromEntity) || [];

    return {
      id: entity.id.toString(),
      status: entity.status,
      comment: entity.comment,
      author,
      reviewer,
      reviewComment: entity.reviewComment,
      reviewedAt: entity.reviewedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      records,
      recordCount: records.length,
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

  @ApiProperty({ description: 'Total number of individual change records' })
  totalRecords: number;
}
