import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
//import { OperationModule } from './operations/operations.module';
//import { ProfilesModule } from './profiles/profiles.module';
//import { PassportModule } from './passport/passport.module';
//import { TaskModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ItemsModule } from './items/items.module';
import { OperationModule } from './operations/operations.module';
import { TechCardModule } from './tech-card/tech-card.module';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [PrismaModule, AuthModule, CategoryModule, ItemsModule, OperationModule, TechCardModule, UnitsModule],
})
export class AppModule {}

