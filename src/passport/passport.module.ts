import { Module } from '@nestjs/common';
import { PassportService } from './passport.service';
import { PassportController } from './passport.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [PassportService, PrismaService],
  controllers: [PassportController],
})
export class PassportModule {}
