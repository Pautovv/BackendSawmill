import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ItemsModule } from './items/items.module';
import { OperationModule } from './operations/operations.module';
import { TechCardModule } from './tech-card/tech-card.module';
import { UnitsModule } from './units/units.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { DocumentModule } from './document/document.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [PrismaModule, AuthModule, CategoryModule, ItemsModule, OperationModule, TechCardModule, UnitsModule, UsersModule, DocumentModule, ReportsModule, TasksModule],
})
export class AppModule {}

