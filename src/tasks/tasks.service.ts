import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, WorkerRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRenderService } from '../document/document.service';

interface NormalizedMaterial {
  id: number;
  material: { name: string };
  quantity: number;
  unit: { id: number; unit: string } | null;
  item: { id: number; available: number | null } | null;
}

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private renderer: DocumentRenderService,
  ) {}

  private readonly ASSIGNABLE_ROLES: UserRole[] = [
    'ADMIN',
    'USER',
    'WAREHOUSE',
    'SELLER',
  ];

  /* ---------- Материалы ---------- */
  private enrichMaterial(raw: any): NormalizedMaterial {
    let baseName: string;
    if (raw.Item) {
      const breedField = raw.Item.fields?.find((f: any) =>
        ['порода', 'breed'].includes(f.key.toLowerCase()),
      );
      baseName = breedField
        ? `${raw.Item.name} ${breedField.value}`.trim()
        : raw.Item.name;
    } else if (raw.nomenclature) {
      baseName = raw.nomenclature.name;
    } else {
      baseName = 'Материал';
    }
    return {
      id: raw.id,
      material: { name: baseName },
      quantity: 1,
      unit: raw.unit ? { id: raw.unit.id, unit: raw.unit.unit } : null,
      item: raw.Item
        ? { id: raw.Item.id, available: raw.Item.quantity ?? null }
        : null,
    };
  }

  private normalizeCardMaterials(card: any) {
    for (const step of card.steps) {
      for (const m of step.materials as any[]) {
        const norm = this.enrichMaterial(m);
        if (!m.material) m.material = norm.material;
        if (m.quantity == null) m.quantity = norm.quantity;
        if (!m.displayName) m.displayName = norm.material.name;
      }
    }
  }

  /* ---------- Техкарты / выдача ---------- */
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
                Item: {
                  select: {
                    id: true,
                    name: true,
                    quantity: true,
                    fields: true,
                  },
                },
                unit: { select: { id: true, unit: true } },
                nomenclature: { select: { id: true, name: true } },
              },
            },
            fields: true,
          },
        },
      },
    });
    if (!card) throw new NotFoundException('TechCard not found');
    this.normalizeCardMaterials(card);
    return card;
  }

  async listAssignableUsers(q?: string) {
    const where: Prisma.UserWhereInput = {
      role: { in: this.ASSIGNABLE_ROLES },
    };
    if (q?.trim()) {
      const s = q.trim();
      (where.OR ||= []).push(
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      );
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async createTaskWithDocuments(payload: {
    techCardId: number;
    name?: string;
    fields?: { key: string; value: string }[];
    assignments: Array<{
      stepId: number;
      plannedQuantity?: number;
      leadUserIds: number[];
      memberUserIds: number[];
    }>;
    preGeneratePdfs?: boolean;
  }) {
    const {
      techCardId,
      name,
      fields = [],
      assignments = [],
      preGeneratePdfs = true,
    } = payload;

    const techCard = await this.getTechCardDetails(techCardId);
    if (!assignments.length) {
      throw new BadRequestException('No assignments provided');
    }

    const validStepIds = new Set(techCard.steps.map((s: any) => s.id));
    for (const a of assignments) {
      if (!validStepIds.has(a.stepId)) {
        throw new BadRequestException(
          `Step ${a.stepId} does not belong to TechCard ${techCardId}`,
        );
      }
    }

    const userSet = new Set<number>();
    assignments.forEach((a) => {
      (a.leadUserIds || []).forEach((u) => userSet.add(u));
      (a.memberUserIds || []).forEach((u) => userSet.add(u));
    });
    if (!userSet.size) {
      throw new BadRequestException('No users selected for assignments');
    }
    const userIds = Array.from(userSet);

    const result = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          techCardId,
          name:
            name?.trim() ||
            `${techCard.name} — задание от ${new Date().toLocaleDateString()}`,
          fields: fields.length ? { create: fields } : undefined,
        },
        include: { fields: true },
      });

      for (const a of assignments) {
        const plannedQuantity =
          a.plannedQuantity != null ? a.plannedQuantity : 1;
        const stepAssignment = await tx.taskStepAssignment.create({
          data: { taskId: task.id, stepId: a.stepId, plannedQuantity },
        });

        const workers: Prisma.TaskWorkerAssignmentCreateManyInput[] = [];
        (a.leadUserIds || []).forEach((userId) =>
          workers.push({
            stepAssignmentId: stepAssignment.id,
            userId,
            role: 'LEAD',
          }),
        );
        (a.memberUserIds || []).forEach((userId) =>
          workers.push({
            stepAssignmentId: stepAssignment.id,
            userId,
            role: 'MEMBER',
          }),
        );
        if (workers.length) {
          await tx.taskWorkerAssignment.createMany({
            data: workers,
            skipDuplicates: true,
          });
        }
      }

      const shortages: any[] = [];

      const users = await tx.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      const stepMap = new Map(techCard.steps.map((s: any) => [s.id, s]));

      const userSteps = new Map<
        number,
        Array<{ role: 'LEAD' | 'MEMBER'; stepId: number; plannedQuantity: number }>
      >();

      for (const a of assignments) {
        const pq = a.plannedQuantity != null ? a.plannedQuantity : 1;
        (a.leadUserIds || []).forEach((uid) => {
          const arr = userSteps.get(uid) || [];
          arr.push({ role: 'LEAD', stepId: a.stepId, plannedQuantity: pq });
          userSteps.set(uid, arr);
        });
        (a.memberUserIds || []).forEach((uid) => {
          const arr = userSteps.get(uid) || [];
          arr.push({ role: 'MEMBER', stepId: a.stepId, plannedQuantity: pq });
          userSteps.set(uid, arr);
        });
      }

      const docsCreated: Array<{ id: number; taskId: number; userId: number }> =
        [];

      for (const uid of userIds) {
        const stepsForUser = (userSteps.get(uid) || []).sort((a, b) => {
          const sa = stepMap.get(a.stepId)?.order ?? 0;
          const sb = stepMap.get(b.stepId)?.order ?? 0;
          return sa - sb;
        });
        const u = userMap.get(uid);

        const docContent = {
          task: {
            id: task.id,
            name: task.name,
            createdAt: new Date().toISOString(),
          },
          techCard: {
            id: techCard.id,
            name: techCard.name,
            item: techCard.item
              ? { id: techCard.item.id, name: techCard.item.name }
              : null,
          },
          user: u
            ? {
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                role: u.role,
              }
            : { id: uid },
          steps: stepsForUser.map(({ role, stepId, plannedQuantity }) => {
            const s: any = stepMap.get(stepId);
            return {
              id: s.id,
              order: s.order,
              name: s.name,
              role,
              plannedQuantity,
              operation: s.operation
                ? { id: s.operation.id, name: s.operation.name }
                : null,
              machine: s.machine
                ? { id: s.machine.id, name: s.machine.name }
                : null,
              materials: s.materials.map((mm: any) => this.enrichMaterial(mm)),
              fields: s.fields.map((f: any) => ({ key: f.key, value: f.value })),
            };
          }),
          shortages,
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

      return { task, documents: docsCreated, shortages };
    });

    if (preGeneratePdfs) {
      const docs = await this.prisma.taskDocument.findMany({
        where: { taskId: result.task.id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
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

    return {
      task: result.task,
      documents: result.documents.map((d) => ({
        id: d.id,
        pdfUrl: `/task-documents/${d.id}/pdf`,
        previewUrl: `/task-documents/${d.id}/preview`,
      })),
      printAllUrl: `/tasks/${result.task.id}/print`,
      shortages: result.shortages,
      hasShortages: result.shortages.length > 0,
    };
  }

  /* ---------- МОИ ЗАДАНИЯ (исправлено) ---------- */
  async listMyTasks(userId: number) {
    const assignments = await this.prisma.taskWorkerAssignment.findMany({
      where: { userId },
      include: {
        stepAssignment: {
          select: {
            id: true,
            taskId: true,
            plannedQuantity: true,
            step: {
              select: {
                id: true,
                order: true,
                name: true,
                operation: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!assignments.length) return [];

    const taskIds = Array.from(
      new Set(assignments.map((a) => a.stepAssignment.taskId)),
    );

    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        stepAssignments: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stepAssignmentIds = assignments.map((a) => a.stepAssignment.id);
    const myResults = await this.prisma.taskStepResult.findMany({
      where: { stepAssignmentId: { in: stepAssignmentIds } },
      select: { stepAssignmentId: true, quantity: true, notes: true },
    });
    const resMap = new Map(myResults.map((r) => [r.stepAssignmentId, r]));

    return tasks.map((t) => {
      const mySteps = assignments
        .filter((a) => a.stepAssignment.taskId === t.id)
        .map((a) => {
          const result = resMap.get(a.stepAssignment.id);
          const stepData = a.stepAssignment.step;
          const opName = stepData.operation?.name?.toLowerCase?.() || '';
          const tentativeSupply =
            opName.includes('склад') ||
            opName.includes('выдать') ||
            opName.includes('отгруз');
          const isSupply = tentativeSupply;
          return {
            stepAssignmentId: a.stepAssignment.id,
            stepId: stepData.id,
            order: stepData.order,
            name: stepData.name,
            plannedQuantity: a.stepAssignment.plannedQuantity ?? 1,
            hasResult: !!result,
            resultQuantity: result?.quantity ?? null,
            resultNotes: result?.notes ?? null,
            isSupply,
          };
        })
        .sort((a, b) => a.order - b.order);

      const done = mySteps.filter((s) => s.hasResult).length;
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt,
        stepsTotal: t.stepAssignments.length,
        mySteps,
        progress: { done, total: mySteps.length },
      };
    });
  }

  async getMyTaskDetails(taskId: number, userId: number) {
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
        stepAssignments: {
          include: {
            workers: true,
            step: {
              include: {
                operation: true,
                machine: true,
                materials: {
                  include: {
                    Item: { select: { id: true, name: true, quantity: true } },
                    nomenclature: true,
                  },
                },
                fields: true,
              },
            },
            results: true,
          },
        },
        documents: {
          where: { userId },
          select: { id: true, status: true },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const myAssignments = task.stepAssignments.filter((sa) =>
      sa.workers.some((w) => w.userId === userId),
    );
    if (!myAssignments.length) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    const mySteps = myAssignments
      .map((sa) => {
        const step = sa.step;
        const result = sa.results[0] || null;
        const opName = step.operation?.name?.toLowerCase?.() || '';
        const tentativeSupply =
          opName.includes('склад') ||
          opName.includes('выдать') ||
          opName.includes('отгруз');
        const isSupply = tentativeSupply;

        return {
          stepAssignmentId: sa.id,
          stepId: step.id,
          order: step.order,
          name: step.name,
          plannedQuantity: sa.plannedQuantity ?? 1,
          operation: step.operation
            ? { id: step.operation.id, name: step.operation.name }
            : null,
          machine: step.machine
            ? { id: step.machine.id, name: step.machine.name }
            : null,
          fields: step.fields.map((f) => ({ key: f.key, value: f.value })),
          materials: step.materials.map((m) => ({
            id: m.id,
            name: m.Item?.name || m.nomenclature?.name || 'Материал',
            available: m.Item?.quantity ?? null,
          })),
          result: result
            ? {
                quantity: result.quantity ?? null,
                notes: result.notes ?? null,
              }
            : null,
          isSupply,
        };
      })
      .sort((a, b) => a.order - b.order);

    const doc = task.documents[0] || null;
    return {
      id: task.id,
      name: task.name,
      status: task.status,
      createdAt: task.createdAt,
      techCard: task.techCard,
      mySteps,
      document: doc,
    };
  }

  async submitMyStepResult(
    userId: number,
    stepAssignmentId: number,
    body: { quantity?: number; notes?: string },
  ) {
    const sa = await this.prisma.taskStepAssignment.findUnique({
      where: { id: stepAssignmentId },
      include: {
        workers: true,
        task: {
          include: {
            documents: { where: { userId }, select: { id: true, status: true } },
            stepAssignments: {
              include: { workers: true, results: true },
            },
          },
        },
      },
    });
    if (!sa) throw new NotFoundException('Step assignment not found');
    if (!sa.workers.some((w) => w.userId === userId)) {
      throw new ForbiddenException('Not your step');
    }

    let report = await this.prisma.taskReport.findUnique({
      where: { taskId: sa.taskId },
    });
    if (!report) {
      report = await this.prisma.taskReport.create({
        data: { taskId: sa.taskId },
      });
    }

    const quantity =
      body.quantity != null && body.quantity >= 0 ? body.quantity : null;

    const existing = await this.prisma.taskStepResult.findFirst({
      where: { stepAssignmentId },
    });

    let result;
    if (existing) {
      result = await this.prisma.taskStepResult.update({
        where: { id: existing.id },
        data: { quantity, notes: body.notes ?? existing.notes ?? null },
      });
    } else {
      result = await this.prisma.taskStepResult.create({
        data: {
          taskReportId: report.id,
          stepAssignmentId,
          quantity,
          notes: body.notes ?? null,
        },
      });
    }

    const myAssignments = sa.task.stepAssignments.filter((a) =>
      a.workers.some((w) => w.userId === userId),
    );
    const myDone = await this.prisma.taskStepResult.count({
      where: { stepAssignmentId: { in: myAssignments.map((a) => a.id) } },
    });
    const allMyStepsCompleted = myDone === myAssignments.length;

    let document = sa.task.documents[0] || null;
    if (document && allMyStepsCompleted && document.status !== 'DONE') {
      document = await this.prisma.taskDocument.update({
        where: { id: document.id },
        data: { status: 'DONE' },
        select: { id: true, status: true },
      });
    } else if (document && document.status === 'NEW') {
      document = await this.prisma.taskDocument.update({
        where: { id: document.id },
        data: { status: 'IN_PROGRESS' },
        select: { id: true, status: true },
      });
    }

    return {
      ok: true,
      stepAssignmentId,
      result: { quantity: result.quantity, notes: result.notes },
      document,
      allMyStepsCompleted,
    };
  }

  async issueWarehouseStep(
    userId: number,
    stepAssignmentId: number,
    body?: { notes?: string },
  ) {
    const sa = await this.prisma.taskStepAssignment.findUnique({
      where: { id: stepAssignmentId },
      include: {
        workers: {
          include: { user: { select: { id: true, role: true } } },
        },
        task: {
          include: {
            documents: { where: { userId }, select: { id: true, status: true } },
            stepAssignments: { include: { workers: true, results: true } },
          },
        },
        step: {
          include: { operation: true, fields: true },
        },
      },
    });
    if (!sa) throw new NotFoundException('Step assignment not found');
    if (!sa.workers.some((w) => w.userId === userId)) {
      throw new ForbiddenException('Not your step');
    }
    const myWorker = sa.workers.find((w) => w.userId === userId);
    const userRole = myWorker?.user?.role;
    if (userRole !== 'WAREHOUSE') {
      throw new ForbiddenException('Only warehouse role can issue directly');
    }

    const plannedQuantity = sa.plannedQuantity ?? 1;

    let report = await this.prisma.taskReport.findUnique({
      where: { taskId: sa.taskId },
    });
    if (!report) {
      report = await this.prisma.taskReport.create({
        data: { taskId: sa.taskId },
      });
    }

    const existing = await this.prisma.taskStepResult.findFirst({
      where: { stepAssignmentId },
    });
    const notes =
      body?.notes?.trim() || `Выдано со склада (план: ${plannedQuantity})`;

    let result;
    if (existing) {
      result = await this.prisma.taskStepResult.update({
        where: { id: existing.id },
        data: { quantity: plannedQuantity, notes },
      });
    } else {
      result = await this.prisma.taskStepResult.create({
        data: {
          taskReportId: report.id,
          stepAssignmentId,
          quantity: plannedQuantity,
          notes,
        },
      });
    }

    const myAssignments = sa.task.stepAssignments.filter((a) =>
      a.workers.some((w) => w.userId === userId),
    );
    const myDone = await this.prisma.taskStepResult.count({
      where: { stepAssignmentId: { in: myAssignments.map((a) => a.id) } },
    });
    const allMyStepsCompleted = myDone === myAssignments.length;

    let document = sa.task.documents[0] || null;
    if (document) {
      if (allMyStepsCompleted && document.status !== 'DONE') {
        document = await this.prisma.taskDocument.update({
          where: { id: document.id },
          data: { status: 'DONE' },
          select: { id: true, status: true },
        });
      } else if (document.status === 'NEW') {
        document = await this.prisma.taskDocument.update({
          where: { id: document.id },
          data: { status: 'IN_PROGRESS' },
          select: { id: true, status: true },
        });
      }
    }

    return {
      ok: true,
      stepAssignmentId,
      result: { quantity: result.quantity, notes: result.notes },
      document,
      allMyStepsCompleted,
    };
  }

  async countMyUnreadDocuments(userId: number) {
    const unread = await this.prisma.taskDocument.count({
      where: { userId, status: 'NEW' },
    });
    return { unread };
  }

  async markDocumentViewed(userId: number, documentId: number) {
    const doc = await this.prisma.taskDocument.findUnique({
      where: { id: documentId },
      select: { id: true, userId: true, status: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== userId) throw new ForbiddenException('Not your document');
    if (doc.status === 'NEW') {
      return this.prisma.taskDocument.update({
        where: { id: doc.id },
        data: { status: 'IN_PROGRESS' },
        select: { id: true, status: true },
      });
    }
    return doc;
  }
}