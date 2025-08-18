import { Module } from '@nestjs/common';
import { OperationService } from './operations.service';
import { OperationController } from './operations.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OperationController],
  providers: [OperationService, PrismaService],
})
export class OperationModule {}