import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { WiresModule } from './modules/wires/wires.module';
import { UnitPanelsModule } from './modules/unit-panels/unit-panels.module';
import { ChangeRequestsModule } from './modules/change-requests/change-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    WiresModule,
    UnitPanelsModule,
    ChangeRequestsModule,
  ],
})
export class AppModule {}
