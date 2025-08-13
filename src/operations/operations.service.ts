import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Operation, Category } from '@prisma/client';

@Injectable()
export class OperationService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Operation[]> {
    return this.prisma.operation.findMany({
      include: {
        machines: true, 
      },
      orderBy: { id: 'desc' },
    });
  }

  async create(name: string, machineIds: number[]): Promise<Operation> {
    return this.prisma.operation.create({
      data: {
        name,
        machines: {
          connect: machineIds.map((id) => ({ id })),
        },
      },
      include: { machines: true },
    });
  }

  async updateMachines(operationId: number, machineIds: number[]): Promise<Operation> {
    return this.prisma.operation.update({
      where: { id: operationId },
      data: {
        machines: {
          set: machineIds.map((id) => ({ id })),
        },
      },
      include: { machines: true },
    });
  }

  async delete(id: number): Promise<Operation> {
    return this.prisma.operation.delete({ where: { id } });
  }
}
