import { Module } from '@nestjs/common';
import { NomenclatureController } from './nomenclature.controller';
import { NomenclatureService } from './nomenclature.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [NomenclatureController],
  providers: [NomenclatureService, PrismaService],
  exports: [NomenclatureService],
})
export class NomenclatureModule { }