import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRenderService } from 'src/document/document.service';

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private renderer: DocumentRenderService,
    ) { }

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
                                Item: { select: { id: true, name: true } }, // было material
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
        preGeneratePdfs?: boolean;
    }) {
        const { techCardId, name, fields = [], assignments = [], preGeneratePdfs = true } = payload;

        const techCard = await this.getTechCardDetails(techCardId);
        if (!assignments.length) {
            throw new BadRequestException('No assignments provided');
        }

        const validStepIds = new Set(techCard.steps.map((s) => s.id));
        for (const a of assignments) {
            if (!validStepIds.has(a.stepId)) {
                throw new BadRequestException(`Step ${a.stepId} does not belong to TechCard ${techCardId}`);
            }
        }

        const userSet = new Set<number>();
        assignments.forEach((a) => {
            (a.leadUserIds || []).forEach((u) => userSet.add(u));
            (a.memberUserIds || []).forEach((u) => userSet.add(u));
        });
        if (userSet.size === 0) {
            throw new BadRequestException('No users selected for assignments');
        }
        const userIds = Array.from(userSet);

        const result = await this.prisma.$transaction(async (tx) => {
            const task = await tx.task.create({
                data: {
                    techCardId,
                    name: name?.trim() || `${techCard.name} — задание от ${new Date().toLocaleDateString()}`,
                    fields: fields?.length ? { create: fields } : undefined,
                },
                include: { fields: true },
            });

            for (const a of assignments) {
                const stepAssignment = await tx.taskStepAssignment.create({
                    data: { taskId: task.id, stepId: a.stepId },
                });

                const workerCreates: Prisma.TaskWorkerAssignmentCreateManyInput[] = [];
                (a.leadUserIds || []).forEach((userId) =>
                    workerCreates.push({ stepAssignmentId: stepAssignment.id, userId, role: 'LEAD' }),
                );
                (a.memberUserIds || []).forEach((userId) =>
                    workerCreates.push({ stepAssignmentId: stepAssignment.id, userId, role: 'MEMBER' }),
                );
                if (workerCreates.length) {
                    await tx.taskWorkerAssignment.createMany({ data: workerCreates, skipDuplicates: true });
                }
            }

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

            const users = await tx.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
            });
            const userMap = new Map(users.map((u) => [u.id, u]));
            const stepMap = new Map(techCard.steps.map((s) => [s.id, s]));

            const docsCreated: Array<{ id: number; taskId: number; userId: number }> = [];

            for (const uid of userIds) {
                const stepsForUser = (userSteps.get(uid) || []).sort((a, b) => {
                    const sa = stepMap.get(a.stepId)?.order ?? 0;
                    const sb = stepMap.get(b.stepId)?.order ?? 0;
                    return sa - sb;
                });
                const u = userMap.get(uid);
                const docContent = {
                    task: { id: task.id, name: task.name, createdAt: new Date().toISOString() },
                    techCard: {
                        id: techCard.id,
                        name: techCard.name,
                        item: techCard.item ? { id: techCard.item.id, name: techCard.item.name } : null,
                    },
                    user: u
                        ? { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role }
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
                                material: m.Item ? { id: m.Item.id, name: m.Item.name } : null, // было m.material
                                quantity: m.quantity,
                                unit: m.unit ? { id: m.unit.id, unit: m.unit.unit } : null,
                            })),
                            fields: s.fields.map((f) => ({ key: f.key, value: f.value })),
                        };
                    }),
                };

                const created = await tx.taskDocument.create({
                    data: {
                        taskId: task.id,
                        userId: uid,
                        status: 'NEW',
                        content: docContent as unknown as Prisma.JsonObject,
                    },
                    select: { id: true, taskId: true, userId: true },
                });
                docsCreated.push(created);
            }

            return { task, documents: docsCreated };
        });

        if (preGeneratePdfs) {
            const docs = await this.prisma.taskDocument.findMany({
                where: { taskId: result.task.id },
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                },
            });
            await Promise.all(
                docs.map((d) =>
                    this.renderer.ensurePdfForDocument({
                        id: d.id,
                        taskId: d.taskId,
                        user: d.user!,
                        content: d.content,
                    }),
                ),
            );
        }

        const links = result.documents.map((d) => ({
            id: d.id,
            pdfUrl: `/task-documents/${d.id}/pdf`,
            previewUrl: `/task-documents/${d.id}/preview`,
        }));
        const printAllUrl = `/tasks/${result.task.id}/print`;

        return {
            task: result.task,
            documents: links,
            printAllUrl,
        };
    }
}