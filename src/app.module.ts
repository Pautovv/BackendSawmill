import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { OperationModule } from './operations/operations.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PassportModule } from './passport/passport.module';
import { TaskModule } from './tasks/tasks.module';
import { WorkersModule } from './workers/workers.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [InventoryModule, PrismaModule, OperationModule, ProfilesModule, PassportModule, TaskModule, WorkersModule, AuthModule],
})
export class AppModule {}

