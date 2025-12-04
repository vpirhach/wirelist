import { PartialType } from '@nestjs/swagger';
import { CreateWireDto } from './create-wire.dto';

export class UpdateWireDto extends PartialType(CreateWireDto) {}
