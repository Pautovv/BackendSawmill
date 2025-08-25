import { Module } from '@nestjs/common';
import { TechCardController } from './tech-card.controller';
import { TechCardService } from './tech-card.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TechCardController],
  providers: [TechCardService, PrismaService],
  exports: [TechCardService],
})
export class TechCardModule { }