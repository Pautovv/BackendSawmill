import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TaskService {
  async createTask(data: {
    passportId: number;
    steps: {
      stepNumber: number;
      mainWorkerId: number;
      secondaryWorkerIds?: number[];
    }[];
  }) {
    try {
      return prisma.task.create({
        data: {
          passportId: data.passportId,
          steps: {
            create: data.steps.map((step) => ({
              stepNumber: step.stepNumber,
              mainWorker: { connect: { id: step.mainWorkerId } }, // Исправление для mainWorker
              secondaryWorkers: {
                create: step.secondaryWorkerIds?.map((id) => ({ user: { connect: { id } } })) || [], // Исправление для secondaryWorkers
              },
            })),
          },
        },
        include: {
          steps: {
            include: {
              mainWorker: true, // Основной работник
              secondaryWorkers: { include: { user: true } }, // Включаем вторичных работников
            },
          },
        },
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async findAll() {
    return prisma.task.findMany({
      include: {
        passport: true,
        steps: {
          include: {
            mainWorker: true, // Основной работник
            secondaryWorkers: { include: { user: true } }, // Включаем вторичных работников
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        passport: true,
        steps: {
          include: {
            mainWorker: true, // Основной работник
            secondaryWorkers: { include: { user: true } }, // Включаем вторичных работников
          },
        },
      },
    });
  }

  async updateTask(id: number, data: Partial<{
    passportId: number;
    steps: {
      stepNumber: number;
      mainWorkerId: number;
      secondaryWorkerIds?: number[];
    }[];
  }>) {
    return prisma.task.update({
      where: { id },
      data: {
        passportId: data.passportId,
        steps: data.steps
          ? {
              deleteMany: {}, // Удаляем все шаги перед обновлением
              create: data.steps.map((step) => ({
                stepNumber: step.stepNumber,
                mainWorker: { connect: { id: step.mainWorkerId } }, // Исправление для mainWorker
                secondaryWorkers: {
                  create: step.secondaryWorkerIds?.map((id) => ({ user: { connect: { id } } })) || [], // Исправление для secondaryWorkers
                },
              })),
            }
          : undefined,
      },
      include: {
        steps: {
          include: {
            mainWorker: true, // Основной работник
            secondaryWorkers: { include: { user: true } }, // Включаем вторичных работников
          },
        },
      },
    });
  }

  async remove(id: number) {
    return prisma.task.delete({ where: { id } });
  }
}