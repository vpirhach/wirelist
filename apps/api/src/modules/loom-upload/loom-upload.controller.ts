import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { LoomUploadService } from './loom-upload.service';
import { LoomSubmitDto } from './dto/loom-submit.dto';

const DOC_FILTER = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
  ];
  const name = file.originalname.toLowerCase();
  const okExt = name.endsWith('.doc') || name.endsWith('.docx');
  if (allowed.includes(file.mimetype) || okExt) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only .doc and .docx files are allowed'), false);
  }
};

@ApiTags('Loom import')
@ApiBearerAuth()
@Controller('loom-upload')
@UseGuards(JwtAuthGuard)
export class LoomUploadController {
  constructor(private readonly loomUpload: LoomUploadService) {}

  @Post('preview')
  @ApiOperation({
    summary: 'Upload Word wire lists to Loom and preview DB diff (add/edit/delete)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        skipDeletes: {
          type: 'string',
          description: 'If "true", only ADD and UPDATE rows are proposed (no DELETE)',
          example: 'false',
        },
        fullSyncDeletes: {
          type: 'string',
          description:
            'If "true", DELETE any DB wire whose route is not in the file (full snapshot). Default is scoped: only DELETE wires whose fromDestination appears in the file but route is missing.',
          example: 'false',
        },
        actionDriven: {
          type: 'string',
          description:
            'If "true", the record type is taken from the document Del/Add column (Add->CREATE, Del->DELETE) instead of diffing routes against the DB. Deletes are never inferred from absence.',
          example: 'false',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({ status: 201 })
  @UseInterceptors(
    FilesInterceptor('files', 100, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: DOC_FILTER,
    }),
  )
  async preview(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('skipDeletes') skipDeletesRaw?: string,
    @Body('fullSyncDeletes') fullSyncDeletesRaw?: string,
    @Body('actionDriven') actionDrivenRaw?: string,
    @CurrentUser() _user?: User,
  ) {
    if (!files?.length) {
      throw new BadRequestException('At least one file is required (field: files)');
    }
    const skipDeletes = skipDeletesRaw === 'true' || skipDeletesRaw === '1';
    const fullDbDeleteSync = fullSyncDeletesRaw === 'true' || fullSyncDeletesRaw === '1';
    const actionDriven = actionDrivenRaw === 'true' || actionDrivenRaw === '1';
    return this.loomUpload.preview(files, skipDeletes, fullDbDeleteSync, actionDriven);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit selected preview rows as one change request' })
  @ApiResponse({ status: 201 })
  async submit(@Body() dto: LoomSubmitDto, @CurrentUser() user: User) {
    return this.loomUpload.submit(dto.previewId, dto.selectedItemIds, dto.comment, user);
  }
}
