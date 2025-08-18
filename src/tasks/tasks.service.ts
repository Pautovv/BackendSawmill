import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
    constructor(private prisma: PrismaService) { }

    async listTechCards(search?: string) {
        const where = search
            ? { name: { contains: search, mode: 'insensitive' as const } }
            : undefined;
        return this.prisma.techCard.findMany({
            where,
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                item: { select: { id: true, name: true } },
                _count: { select: { steps: true } },
            },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        });
    }

    async getTechCardDetails(id: number) {
        const card = await this.prisma.techCard.findUnique({
            where: { id },
            include: {
                item: { select: { id: true, name: true } },
                steps: {
                    orderBy: { order: 'asc' },
                    include: {
                        operation: { select: { id: true, name: true } },
                        machine: { select: { id: true, name: true } },
                        materials: {
                            include: {
                                material: { select: { id: true, name: true } },
                                unit: { select: { id: true, unit: true } },
                            },
                        },
                        fields: true,
                    },
                },
            },
        });
        if (!card) throw new BadRequestException('TechCard not found');
        return card;
    }

    async createTaskWithDocuments(payload: {
        techCardId: number;
        name?: string;
        fields?: { key: string; value: string }[];
        assignments: Array<{ stepId: number; leadUserIds: number[]; memberUserIds: number[] }>;
    }) {
        const { techCardId, name, fields = [], assignments = [] } = payload;

        const techCard = await this.getTechCardDetails(techCardId);
        if (!assignments.length) {
            throw new BadRequestException('No assignments provided');
        }

        // Проверка, что stepId действительно относятся к этой техкарте
        const validStepIds = new Set(techCard.steps.map((s) => s.id));
        for (const a of assignments) {
            if (!validStepIds.has(a.stepId)) {
                throw new BadRequestException(`Step ${a.stepId} does not belong to TechCard ${techCardId}`);
            }
        }

        // Собираем уникальных пользователей для документов
        const userSet = new Set<number>();
        assignments.forEach((a) => {
            (a.leadUserIds || []).forEach((u) => userSet.add(u));
            (a.memberUserIds || []).forEach((u) => userSet.add(u));
        });
        if (userSet.size === 0) {
            throw new BadRequestException('No users selected for assignments');
        }
        const userIds = Array.from(userSet);

        // Транзакция
        return this.prisma.$transaction(async (tx: PrismaClient) => {
            // 1) Создаём Task
            const task = await tx.task.create({
                data: {
                    techCardId,
                    name: name?.trim() || `${techCard.name} — задание от ${new Date().toLocaleDateString()}`,
                    fields: fields?.length ? { create: fields } : undefined,
                },
                include: { fields: true },
            });

            // 2) Создаём step-assignments и worker-assignments
            for (const a of assignments) {
                const stepAssignment = await tx.taskStepAssignment.create({
                    data: { taskId: task.id, stepId: a.stepId },
                });

                const workerCreates: Prisma.TaskWorkerAssignmentCreateManyInput[] = [];

                (a.leadUserIds || []).forEach((userId) =>
                    workerCreates.push({ stepAssignmentId: stepAssignment.id, userId, role: 'LEAD' as const }),
                );
                (a.memberUserIds || []).forEach((userId) =>
                    workerCreates.push({ stepAssignmentId: stepAssignment.id, userId, role: 'MEMBER' as const }),
                );

                if (workerCreates.length) {
                    await tx.taskWorkerAssignment.createMany({ data: workerCreates, skipDuplicates: true });
                }
            }

            // 3) Собираем контент документов для каждого пользователя
            // Карта userId -> список шагов с ролью
            const userSteps = new Map<number, Array<{ role: 'LEAD' | 'MEMBER'; stepId: number }>>();
            for (const a of assignments) {
                (a.leadUserIds || []).forEach((uid) => {
                    const arr = userSteps.get(uid) || [];
                    arr.push({ role: 'LEAD', stepId: a.stepId });
                    userSteps.set(uid, arr);
                });
                (a.memberUserIds || []).forEach((uid) => {
                    const arr = userSteps.get(uid) || [];
                    arr.push({ role: 'MEMBER', stepId: a.stepId });
                    userSteps.set(uid, arr);
                });
            }

            // Подтягиваем пользователей
            const users = await tx.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
            });
            const userMap = new Map(users.map((u) => [u.id, u]));

            // Подготовим карту шагов по id для быстрого доступа
            const stepMap = new Map(techCard.steps.map((s) => [s.id, s]));

            // 4) Создаём документы
            for (const uid of userIds) {
                const stepsForUser = (userSteps.get(uid) || []).sort((a, b) => {
                    const sa = stepMap.get(a.stepId)?.order ?? 0;
                    const sb = stepMap.get(b.stepId)?.order ?? 0;
                    return sa - sb;
                });

                const user = userMap.get(uid);
                // Содержимое документа: только необходимые шаги с материалами и полями
                const docContent = {
                    task: { id: task.id, name: task.name, createdAt: new Date().toISOString() },
                    techCard: {
                        id: techCard.id,
                        name: techCard.name,
                        item: techCard.item ? { id: techCard.item.id, name: techCard.item.name } : null,
                    },
                    user: user
                        ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
                        : { id: uid },
                    steps: stepsForUser.map(({ role, stepId }) => {
                        const s = stepMap.get(stepId)!;
                        return {
                            id: s.id,
                            order: s.order,
                            name: s.name,
                            role,
                            operation: s.operation ? { id: s.operation.id, name: s.operation.name } : null,
                            machine: s.machine ? { id: s.machine.id, name: s.machine.name } : null,
                            materials: s.materials.map((m) => ({
                                id: m.id,
                                material: { id: m.material.id, name: m.material.name },
                                quantity: m.quantity,
                                unit: m.unit ? { id: m.unit.id, unit: m.unit.unit } : null,
                            })),
                            fields: s.fields.map((f) => ({ key: f.key, value: f.value })),
                        };
                    }),
                };

                await tx.taskDocument.create({
                    data: {
                        taskId: task.id,
                        userId: uid,
                        status: 'NEW',
                        content: docContent as unknown as Prisma.JsonObject,
                    },
                });
            }

            // Вернём Task + краткую сводку по документам
            const docs = await tx.taskDocument.findMany({
                where: { taskId: task.id },
                select: { id: true, userId: true, status: true },
            });

            return { task, documents: docs };
        });
    }
}