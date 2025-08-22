import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async listTasks(params: {
        search?: string;
        status?: TaskStatus | 'ALL';
        from?: string;
        to?: string;
        techCardId?: number;
        itemId?: number;
        page?: number;
        perPage?: number;
    }) {
        const {
            search = '',
            status = 'ALL',
            from,
            to,
            techCardId,
            itemId,
            page = 1,
            perPage = 20,
        } = params;

        const where: Prisma.TaskWhereInput = {};

        if (status !== 'ALL') where.status = status as TaskStatus;

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        if (techCardId) where.techCardId = techCardId;

        if (itemId) {
            where.techCard = {
                item: { id: itemId },
            };
        }

        if (search.trim()) {
            const term = search.trim();
            where.OR = [
                { name: { contains: term, mode: 'insensitive' } },
                { techCard: { name: { contains: term, mode: 'insensitive' } } },
                { techCard: { item: { name: { contains: term, mode: 'insensitive' } } } },
            ];
        }

        const [total, tasks] = await this.prisma.$transaction([
            this.prisma.task.count({ where }),
            this.prisma.task.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    techCard: { select: { id: true, name: true, item: { select: { id: true, name: true } } } },
                    _count: { select: { stepAssignments: true } },
                    report: {
                        select: {
                            id: true,
                            totalQuantity: true,
                            totalUnit: true,
                            stepResults: { select: { id: true } },
                        },
                    },
                },
                skip: (page - 1) * perPage,
                take: perPage,
            }),
        ]);

        const data = tasks.map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            createdAt: t.createdAt,
            techCard: t.techCard,
            stepsCount: t._count.stepAssignments,
            reportedStepsCount: t.report?.stepResults?.length ?? 0,
            totalQuantity: t.report?.totalQuantity ?? null,
            totalUnit: t.report?.totalUnit ?? null,
        }));

        return {
            page,
            perPage,
            total,
            data,
        };
    }

    async getTaskDetails(taskId: number) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: {
                techCard: {
                    select: {
                        id: true,
                        name: true,
                        item: { select: { id: true, name: true } },
                    },
                },
                fields: true,
                stepAssignments: {
                    include: {
                        step: {
                            select: { id: true, order: true, name: true, operation: { select: { id: true, name: true } } },
                        },
                        workers: {
                            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
                        },
                    },
                    orderBy: { step: { order: 'asc' } },
                },
                report: {
                    include: {
                        stepResults: { include: { stepAssignment: { select: { id: true } } } },
                    },
                },
            },
        });
        if (!task) throw new NotFoundException('Task not found');

        const stepResultsMap = new Map<number, { quantity: number | null; unit: string | null; notes: string | null }>();
        task.report?.stepResults.forEach((r) => {
            stepResultsMap.set(r.stepAssignmentId, {
                quantity: r.quantity ?? null,
                unit: r.unit ?? null,
                notes: r.notes ?? null,
            });
        });

        return {
            id: task.id,
            name: task.name,
            status: task.status,
            createdAt: task.createdAt,
            techCard: task.techCard,
            fields: task.fields,
            steps: task.stepAssignments.map((sa) => ({
                stepAssignmentId: sa.id,
                step: {
                    id: sa.step.id,
                    order: sa.step.order,
                    name: sa.step.name,
                    operation: sa.step.operation,
                },
                workers: sa.workers.map((w) => ({
                    id: w.user.id,
                    name: `${w.user.lastName} ${w.user.firstName}`,
                    role: w.role,
                })),
                result: stepResultsMap.get(sa.id) ?? { quantity: null, unit: null, notes: null },
            })),
            report: task.report
                ? {
                    id: task.report.id,
                    totalQuantity: task.report.totalQuantity ?? null,
                    totalUnit: task.report.totalUnit ?? null,
                    notes: task.report.notes ?? null,
                }
                : { id: null, totalQuantity: null, totalUnit: null, notes: null },
        };
    }

    async saveTaskReport(taskId: number, body: {
        status?: TaskStatus;
        total?: { quantity?: number | null; unit?: string | null; notes?: string | null };
        results: Array<{ stepAssignmentId: number; quantity?: number | null; unit?: string | null; notes?: string | null }>;
    }) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            select: { id: true, status: true, stepAssignments: { select: { id: true } } },
        });
        if (!task) throw new NotFoundException('Task not found');

        const allowedStepAssignmentIds = new Set(task.stepAssignments.map((s) => s.id));
        for (const r of body.results || []) {
            if (!allowedStepAssignmentIds.has(r.stepAssignmentId)) {
                throw new BadRequestException(`stepAssignmentId ${r.stepAssignmentId} does not belong to Task ${taskId}`);
            }
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            // ensure report exists
            const report = await tx.taskReport.upsert({
                where: { taskId },
                create: {
                    taskId,
                    totalQuantity: body.total?.quantity ?? null,
                    totalUnit: body.total?.unit ?? null,
                    notes: body.total?.notes ?? null,
                },
                update: {
                    totalQuantity: body.total?.quantity ?? null,
                    totalUnit: body.total?.unit ?? null,
                    notes: body.total?.notes ?? null,
                },
                select: { id: true },
            });

            // upsert each step result
            for (const r of body.results || []) {
                await tx.taskStepResult.upsert({
                    where: {
                        taskReportId_stepAssignmentId: {
                            taskReportId: report.id,
                            stepAssignmentId: r.stepAssignmentId,
                        },
                    },
                    create: {
                        taskReportId: report.id,
                        stepAssignmentId: r.stepAssignmentId,
                        quantity: r.quantity ?? null,
                        unit: r.unit ?? null,
                        notes: r.notes ?? null,
                    },
                    update: {
                        quantity: r.quantity ?? null,
                        unit: r.unit ?? null,
                        notes: r.notes ?? null,
                    },
                });
            }

            // optionally update task status
            if (body.status && body.status !== task.status) {
                await tx.task.update({ where: { id: taskId }, data: { status: body.status } });
            }

            return report.id;
        });

        return { ok: true, reportId: updated };
    }
}