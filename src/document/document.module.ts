import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentController } from './document.controller';
import { DocumentRenderService } from './document.service';

@Module({
  controllers: [DocumentController],
  providers: [PrismaService, DocumentRenderService],
  exports: [DocumentRenderService],
})
export class DocumentModule { }