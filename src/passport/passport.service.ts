import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Passport, PassportStep } from '@prisma/client';

@Injectable()
export class PassportService {
  constructor(private prisma: PrismaService) {}

  async createPassport(data: {
    productName: string;
    steps: Array<{
      machineId?: number;
      operationId?: number;
      profileId?: number;
      rawMaterialId?: number;
      repeats?: number;
    }>;
  }): Promise<Passport> {
    return this.prisma.passport.create({
      data: {
        productName: data.productName,
        steps: {
          create: data.steps.map(step => ({
            machineId: step.machineId,
            operationId: step.operationId,
            profileId: step.profileId,
            rawMaterialId: step.rawMaterialId,
            repeats: step.repeats ?? 1,
          })),
        },
      },
      include: { steps: true },
    });
  }

  async getAll(): Promise<Passport[]> {
    return this.prisma.passport.findMany({
      include: {
        steps: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getOne(id: number): Promise<Passport | null> {
    return this.prisma.passport.findUnique({
      where: { id },
      include: { steps: true },
    });
  }
}
