import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRenderService } from '../document/document.service';

/**
 * Inventory step semantic
 */
type InventoryMode = 'ISSUE' | 'RECEIVE' | 'NONE';

interface NormalizedMaterial {
  id: number;
  material: { name: string };
  quantity: number;
  unit: { id: number; unit: string } | null;
  item: { id: number; available: number | null; size?: string | null } | null;
  baseSize?: string | null;
  perUnitMetrics?: { lm: number | null; m2: number | null; m3: number | null } | null;
  totalMetrics?: { lm: number | null; m2: number | null; m3: number | null } | null;
}

/* ====== Size / Metrics Utils ====== */
const SIZE_SEP_RE = /x|×|\*|х/gi;
function num(val: any) {
  if (val == null) return NaN;
  return Number(String(val).replace(',', '.'));
}
function tokenToMeters(raw: string) {
  const s = String(raw).trim().toLowerCase();
  const n = num(s.replace(/[^\d.,-]/g, ''));
  if (!isFinite(n)) return NaN;
  if (s.includes('мм') || s.includes('mm')) return n / 1000;
  if (s.includes('см') || s.includes('cm')) return n / 100;
  if (/(^|\d)(м|m)$/.test(s)) return n;
  return n / 1000;
}
function parseSize(sizeStr: string) {
  if (!sizeStr) return null;
  const parts = sizeStr
    .split(SIZE_SEP_RE)
    .map(p => p.trim())
    .filter(Boolean);
  if (parts.length === 2) {
    const d = tokenToMeters(parts[0]);
    const l = tokenToMeters(parts[1]);
    if (d > 0 && l > 0 && isFinite(d) && isFinite(l)) return { kind: 'LOG' as const, d, l };
    return null;
  }
  if (parts.length === 3) {
    const h = tokenToMeters(parts[0]);
    const w = tokenToMeters(parts[1]);
    const l = tokenToMeters(parts[2]);
    if (h > 0 && w > 0 && l > 0 && isFinite(h) && isFinite(w) && isFinite(l))
      return { kind: 'LUMBER' as const, h, w, l };
    return null;
  }
  return null;
}
function round3(n: number | null | undefined) {
  if (n == null || !isFinite(n)) return null;
  return Number(n.toFixed(3));
}
function metricsFromSize(size: string | null) {
  if (!size) return null;
  const parsed = parseSize(size);
  if (!parsed) return null;
  if (parsed.kind === 'LOG') {
    const { d, l } = parsed;
    const m3 = Math.PI * Math.pow(d / 2, 2) * l;
    const lm = l;
    const m2 = Math.PI * d * l;
    return { lm: round3(lm), m2: round3(m2), m3: round3(m3) };
  }
  if (parsed.kind === 'LUMBER') {
    const { h, w, l } = parsed;
    const m3 = h * w * l;
    const lm = l;
    const m2 = w * l;
    return { lm: round3(lm), m2: round3(m2), m3: round3(m3) };
  }
  return null;
}

const PRINT_SKIP_ROLES: UserRole[] = ['WAREHOUSE', 'SELLER'];

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private renderer: DocumentRenderService,
  ) { }

  private readonly ASSIGNABLE_ROLES: UserRole[] = [
    'ADMIN',
    'USER',
    'WAREHOUSE',
    'SELLER',
  ];

  /* ========= Classification ========= */
  private classifyInventoryStep(step: { name: string; operation?: { name?: string } | null }): InventoryMode {
    const text = [step?.name || '', step?.operation?.name || '']
      .map(s => s.toLowerCase())
      .join(' ');
    const issueWords = ['со склада', 'выдать', 'отгруз', 'списать', 'выдача', 'продать', 'продажа', 'реализовать'];
    const receiveWords = ['на склад', 'принять', 'прием', 'приём', 'получить', 'возврат', 'поступление', 'вернуть', 'принять возврат'];
    const isReceive = receiveWords.some(w => text.includes(w));
    const isIssue = issueWords.some(w => text.includes(w));
    if (isReceive) return 'RECEIVE';
    if (isIssue) return 'ISSUE';
    return 'NONE';
  }
  private canInventoryActor(role?: UserRole | null) {
    return role === 'WAREHOUSE' || role === 'SELLER';
  }

  /* ========= Material normalization + metrics ========= */
  private enrichMaterial(raw: any, plannedQuantity = 1): NormalizedMaterial {
    let displayBase: string;
    let sizeField: string | null = null;

    if (raw.Item) {
      const fields = raw.Item.fields || [];
      const breedField = fields.find((f: any) =>
        ['порода', 'breed'].includes(f.key.toLowerCase()),
      );
      const sizeF = fields.find((f: any) =>
        ['размер', 'size'].includes(f.key.toLowerCase()),
      );
      if (sizeF?.value) sizeField = sizeF.value;
      displayBase = raw.Item.name;
      if (breedField?.value) displayBase += ' ' + breedField.value;
      if (sizeField) displayBase += ' ' + sizeField;
      displayBase = displayBase.trim();
    } else if (raw.nomenclature) {
      displayBase = raw.nomenclature.name;
    } else {
      displayBase = 'Материал';
    }

    const baseSize = sizeField || null;
    const perUnitMetrics = metricsFromSize(baseSize);
    const perCount = raw.quantity != null ? raw.quantity : 1;
    const totalCount = perCount * plannedQuantity;
    let totalMetrics: NormalizedMaterial['totalMetrics'] = null;
    if (perUnitMetrics) {
      totalMetrics = {
        lm: perUnitMetrics.lm != null ? round3(perUnitMetrics.lm * totalCount) : null,
        m2: perUnitMetrics.m2 != null ? round3(perUnitMetrics.m2 * totalCount) : null,
        m3: perUnitMetrics.m3 != null ? round3(perUnitMetrics.m3 * totalCount) : null,
      };
    }

    return {
      id: raw.id,
      material: { name: displayBase },
      quantity: perCount,
      unit: raw.unit ? { id: raw.unit.id, unit: raw.unit.unit } : null,
      item: raw.Item
        ? {
          id: raw.Item.id,
          available: raw.Item.quantity ?? null,
          size: baseSize,
        }
        : null,
      baseSize,
      perUnitMetrics,
      totalMetrics,
    };
  }

  /* ========= TechCards ========= */
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
            operation: true,
            machine: { select: { id: true, name: true } },
            materials: {
              include: {
                Item: { select: { id: true, name: true, quantity: true, fields: true } },
                nomenclature: true,
                unit: true,
              },
            },
            fields: true,
          },
        },
      },
    });
    if (!card) throw new NotFoundException('TechCard not found');
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

  /* ========= Create Task with documents ========= */
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

    if (!assignments.length) throw new BadRequestException('No assignments provided');

    const techCard = await this.prisma.techCard.findUnique({
      where: { id: techCardId },
      include: {
        item: { select: { id: true, name: true } },
        steps: {
          orderBy: { order: 'asc' },
          include: {
            operation: true,
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
                unit: true,
                nomenclature: true,
              },
            },
            fields: true,
          },
        },
      },
    });
    if (!techCard) throw new NotFoundException('TechCard not found');

    const validStepIds = new Set(techCard.steps.map(s => s.id));
    for (const a of assignments) {
      if (!validStepIds.has(a.stepId)) {
        throw new BadRequestException(`Step ${a.stepId} not in techCard`);
      }
    }

    const userSet = new Set<number>();
    assignments.forEach(a => {
      a.leadUserIds.forEach(u => userSet.add(u));
      a.memberUserIds.forEach(u => userSet.add(u));
    });
    if (!userSet.size) throw new BadRequestException('No users assigned');

    const userIds = Array.from(userSet);
    const result = await this.prisma.$transaction(async tx => {
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
        const pq = a.plannedQuantity != null ? a.plannedQuantity : 1;
        const stepAssignment = await tx.taskStepAssignment.create({
          data: { taskId: task.id, stepId: a.stepId, plannedQuantity: pq },
        });

        const adds: Prisma.TaskWorkerAssignmentCreateManyInput[] = [];
        a.leadUserIds.forEach(uid =>
          adds.push({ stepAssignmentId: stepAssignment.id, userId: uid, role: 'LEAD' }),
        );
        a.memberUserIds.forEach(uid =>
          adds.push({ stepAssignmentId: stepAssignment.id, userId: uid, role: 'MEMBER' }),
        );
        if (adds.length)
          await tx.taskWorkerAssignment.createMany({
            data: adds,
            skipDuplicates: true,
          });
      }

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
      const userMap = new Map(users.map(u => [u.id, u]));
      const stepMap = new Map(techCard.steps.map(s => [s.id, s]));
      const userSteps = new Map<
        number,
        Array<{ stepId: number; plannedQuantity: number; role: 'LEAD' | 'MEMBER' }>
      >();

      for (const a of assignments) {
        const pq = a.plannedQuantity != null ? a.plannedQuantity : 1;
        a.leadUserIds.forEach(uid => {
          const arr = userSteps.get(uid) || [];
          arr.push({ stepId: a.stepId, plannedQuantity: pq, role: 'LEAD' });
          userSteps.set(uid, arr);
        });
        a.memberUserIds.forEach(uid => {
          const arr = userSteps.get(uid) || [];
          arr.push({ stepId: a.stepId, plannedQuantity: pq, role: 'MEMBER' });
          userSteps.set(uid, arr);
        });
      }

      const docs: Array<{ id: number; taskId: number; userId: number; printable: boolean }> = [];

      for (const uid of userIds) {
        const stepsForUser = (userSteps.get(uid) || []).sort(
          (a, b) =>
            (stepMap.get(a.stepId)?.order ?? 0) -
            (stepMap.get(b.stepId)?.order ?? 0),
        );
        const u = userMap.get(uid);
        const printable = !PRINT_SKIP_ROLES.includes(u?.role as UserRole);

        const contentSteps = stepsForUser.map(info => {
          const step = stepMap.get(info.stepId)!;
          const invMode = this.classifyInventoryStep(step);
          const mats = step.materials.map(m =>
            this.enrichMaterial(m, info.plannedQuantity),
          );
          return {
            id: step.id,
            order: step.order,
            name: step.name,
            role: info.role,
            plannedQuantity: info.plannedQuantity,
            operation: step.operation
              ? { id: step.operation.id, name: step.operation.name }
              : null,
            machine: step.machine
              ? { id: step.machine.id, name: step.machine.name }
              : null,
            inventoryMode: invMode,
            materials: mats.map(mm => ({
              id: mm.id,
              name: mm.material.name,
              quantityPerRepeat: mm.quantity,
              unit: mm.unit,
              baseSize: mm.baseSize,
              perUnitMetrics: mm.perUnitMetrics,
              totalMetrics: mm.totalMetrics,
            })),
            fields: step.fields.map(f => ({ key: f.key, value: f.value })),
          };
        });

        const docContent = {
          task: { id: task.id, name: task.name, createdAt: new Date().toISOString() },
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
          steps: contentSteps,
        };

        const d = await tx.taskDocument.create({
          data: {
            taskId: task.id,
            userId: uid,
            status: 'NEW',
            printable, // поле есть после миграции
            content: docContent as any,
          },
          select: { id: true, taskId: true, userId: true, printable: true },
        });
        docs.push(d);
      }

      return { task, docs };
    });

    if (preGeneratePdfs) {
      const docs = await this.prisma.taskDocument.findMany({
        where: { taskId: result.task.id, printable: true },
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
        docs.map(d =>
          this.renderer.ensurePdfForDocument({
            id: d.id,
            taskId: d.taskId,
            user: d.user!,
            content: d.content,
            printable: true,
          }),
        ),
      );
    }

    return {
      task: result.task,
      documents: result.docs.map(d => ({
        id: d.id,
        printable: d.printable,
        pdfUrl: d.printable ? `/task-documents/${d.id}/pdf` : null,
        previewUrl: d.printable ? `/task-documents/${d.id}/preview` : null,
      })),
      printAllUrl: `/tasks/${result.task.id}/print`,
    };
  }

  /* ========= List My Tasks ========= */
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
    const taskIds = Array.from(new Set(assignments.map(a => a.stepAssignment.taskId)));
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

    const stepAssignmentIds = assignments.map(a => a.stepAssignment.id);
    const results = await this.prisma.taskStepResult.findMany({
      where: { stepAssignmentId: { in: stepAssignmentIds } },
      select: { stepAssignmentId: true, quantity: true, notes: true },
    });
    const resMap = new Map(results.map(r => [r.stepAssignmentId, r]));

    return tasks.map(t => {
      const mySteps = assignments
        .filter(a => a.stepAssignment.taskId === t.id)
        .map(a => {
          const r = resMap.get(a.stepAssignment.id);
          const stepData = a.stepAssignment.step;
          const mode = this.classifyInventoryStep(stepData);
          return {
            stepAssignmentId: a.stepAssignment.id,
            stepId: stepData.id,
            order: stepData.order,
            name: stepData.name,
            plannedQuantity: a.stepAssignment.plannedQuantity ?? 1,
            hasResult: !!r,
            resultQuantity: r?.quantity ?? null,
            resultNotes: r?.notes ?? null,
            inventoryMode: mode,
            isInventory: mode !== 'NONE',
          };
        })
        .sort((a, b) => a.order - b.order);

      const done = mySteps.filter(s => s.hasResult).length;
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

  /* ========= Task Details ========= */
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
                    Item: { select: { id: true, name: true, quantity: true, fields: true } },
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
          select: { id: true, status: true, printable: true },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const myAssignments = task.stepAssignments.filter(sa =>
      sa.workers.some(w => w.userId === userId),
    );
    if (!myAssignments.length) throw new ForbiddenException('Not assigned');

    const mySteps = myAssignments
      .map(sa => {
        const step = sa.step;
        const result = sa.results[0] || null;
        const mode = this.classifyInventoryStep(step);
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
          fields: step.fields.map(f => ({ key: f.key, value: f.value })),
          materials: step.materials.map(m => ({
            id: m.id,
            Item: m.Item
              ? {
                id: m.Item.id,
                quantity: m.Item.quantity,
                name: m.Item.name,
                fields: m.Item.fields,
              }
              : null,
            available: m.Item?.quantity ?? null,
            name: m.Item?.name || m.nomenclature?.name || 'Материал',
          })),
          result: result
            ? { quantity: result.quantity ?? null, notes: result.notes ?? null }
            : null,
          isInventory: mode !== 'NONE',
          inventoryMode: mode,
        };
      })
      .sort((a, b) => a.order - b.order);

    return {
      id: task.id,
      name: task.name,
      status: task.status,
      createdAt: task.createdAt,
      techCard: task.techCard,
      mySteps,
      document: task.documents[0] || null,
    };
  }

  /* ========= Inventory adjustments ========= */
  private async adjustInventoryDelta(
    tx: Prisma.TransactionClient,
    stepId: number,
    deltaQuantity: number,
    mode: InventoryMode,
  ) {
    if (!deltaQuantity || mode === 'NONE') return [];
    const materials = await tx.techStepMaterial.findMany({
      where: { stepId },
      include: { Item: { select: { id: true, quantity: true } } },
    });

    const changes: Array<{ itemId: number; delta: number; newQuantity: number }> = [];
    for (const m of materials) {
      if (!m.Item) continue;
      const perUnit = 1; // TODO: расширить если появится множитель
      const need = Math.abs(deltaQuantity) * perUnit;
      const current = m.Item.quantity ?? 0;

      if (mode === 'ISSUE') {
        if (deltaQuantity > 0) {
          if (current < need)
            throw new BadRequestException(
              `Недостаточно остатка (item=${m.Item.id}) нужно ${need}, есть ${current}`,
            );
          const upd = await tx.item.update({
            where: { id: m.Item.id },
            data: { quantity: current - need },
            select: { id: true, quantity: true },
          });
          changes.push({ itemId: upd.id, delta: -need, newQuantity: upd.quantity });
        } else {
          const upd = await tx.item.update({
            where: { id: m.Item.id },
            data: { quantity: current + need },
            select: { id: true, quantity: true },
          });
          changes.push({ itemId: upd.id, delta: need, newQuantity: upd.quantity });
        }
      } else if (mode === 'RECEIVE') {
        if (deltaQuantity > 0) {
          const upd = await tx.item.update({
            where: { id: m.Item.id },
            data: { quantity: current + need },
            select: { id: true, quantity: true },
          });
          changes.push({ itemId: upd.id, delta: need, newQuantity: upd.quantity });
        } else {
          if (current < need)
            throw new BadRequestException(
              `Нельзя уменьшить (item=${m.Item.id}) на ${need}, есть ${current}`,
            );
          const upd = await tx.item.update({
            where: { id: m.Item.id },
            data: { quantity: current - need },
            select: { id: true, quantity: true },
          });
          changes.push({ itemId: upd.id, delta: -need, newQuantity: upd.quantity });
        }
      }
    }
    return changes;
  }

  /* ========= Submit Step ========= */
  async submitMyStepResult(
    userId: number,
    stepAssignmentId: number,
    body: { quantity?: number; notes?: string },
  ) {
    return this.prisma.$transaction(async tx => {
      const sa = await tx.taskStepAssignment.findUnique({
        where: { id: stepAssignmentId },
        include: {
          workers: { include: { user: { select: { id: true, role: true } } } },
          step: {
            include: {
              materials: {
                include: { Item: { select: { id: true, quantity: true } } },
              },
              operation: true,
            },
          },
          task: {
            include: {
              documents: {
                where: { userId },
                select: { id: true, status: true, printable: true },
              },
              stepAssignments: { include: { workers: true, results: true } },
            },
          },
          results: true,
        },
      });
      if (!sa) throw new NotFoundException('Step assignment not found');
      if (!sa.workers.some(w => w.userId === userId))
        throw new ForbiddenException('Not your step');

      const userRole = sa.workers.find(w => w.userId === userId)?.user?.role;
      const mode = this.classifyInventoryStep(sa.step);
      const canAdjust = this.canInventoryActor(userRole);
      const hasMaterials = sa.step.materials.length > 0;

      let report = await tx.taskReport.findUnique({ where: { taskId: sa.taskId } });
      if (!report) {
        report = await tx.taskReport.create({ data: { taskId: sa.taskId } });
      }

      const newQuantity =
        body.quantity != null && body.quantity >= 0 ? body.quantity : null;
      const existing = sa.results[0] || null;
      const prevQuantity = existing?.quantity ?? 0;
      const target = newQuantity ?? 0;
      const delta = target - prevQuantity;

      let inventoryChanges: Array<{ itemId: number; delta: number; newQuantity: number }> = [];
      if (delta !== 0 && canAdjust && mode !== 'NONE' && hasMaterials) {
        inventoryChanges = await this.adjustInventoryDelta(tx, sa.stepId, delta, mode);
      }

      let resultRec;
      if (existing) {
        resultRec = await tx.taskStepResult.update({
          where: { id: existing.id },
          data: {
            quantity: newQuantity,
            notes: body.notes != null ? body.notes : existing.notes ?? null,
          },
        });
      } else {
        resultRec = await tx.taskStepResult.create({
          data: {
            taskReportId: report.id,
            stepAssignmentId,
            quantity: newQuantity,
            notes: body.notes ?? null,
          },
        });
      }

      const myAssignments = sa.task.stepAssignments.filter(a =>
        a.workers.some(w => w.userId === userId),
      );
      const myDone = await tx.taskStepResult.count({
        where: { stepAssignmentId: { in: myAssignments.map(a => a.id) } },
      });
      const allMyStepsCompleted = myDone === myAssignments.length;

      let document = sa.task.documents[0] || null;
      if (document && document.printable) {
        if (allMyStepsCompleted && document.status !== 'DONE') {
          document = await tx.taskDocument.update({
            where: { id: document.id },
            data: { status: 'DONE' },
            select: { id: true, status: true, printable: true },
          });
        } else if (document.status === 'NEW') {
          document = await tx.taskDocument.update({
            where: { id: document.id },
            data: { status: 'IN_PROGRESS' },
            select: { id: true, status: true, printable: true },
          });
        }
      }

      return {
        ok: true,
        stepAssignmentId,
        result: {
          quantity: resultRec.quantity,
          notes: resultRec.notes,
        },
        document,
        inventoryMode: mode,
        allMyStepsCompleted,
        inventoryChanges,
      };
    });
  }

  /* ========= Quick warehouse issue (fast complete ISSUE step) ========= */
  async issueWarehouseStep(
    userId: number,
    stepAssignmentId: number,
    body: { notes?: string } = {},
  ) {
    const assignment = await this.prisma.taskStepAssignment.findUnique({
      where: { id: stepAssignmentId },
      include: {
        step: {
          include: {
            materials: {
              include: { Item: { select: { id: true, quantity: true } } },
            },
            operation: true,
          },
        },
        workers: {
          include: {
            user: { select: { id: true, role: true } },
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Step assignment not found');
    if (!assignment.workers.some(w => w.userId === userId)) {
      throw new ForbiddenException('Not assigned to this step');
    }
    const actorRole = assignment.workers.find(w => w.userId === userId)?.user?.role;
    if (!['WAREHOUSE', 'SELLER'].includes(actorRole as string)) {
      throw new ForbiddenException('Fast issue only for warehouse/seller');
    }
    const invMode = this.classifyInventoryStep(assignment.step);
    if (invMode !== 'ISSUE') {
      throw new BadRequestException('Step is not an inventory ISSUE step');
    }
    const qty = assignment.plannedQuantity ?? 1;
    return this.submitMyStepResult(userId, stepAssignmentId, {
      quantity: qty,
      notes: body.notes || `Автовыдача ${qty}`,
    });
  }

  /* ========= Unread documents ========= */
  async countMyUnreadDocuments(userId: number) {
    const unread = await this.prisma.taskDocument.count({
      where: {
        userId,
        status: 'NEW',
      },
    });
    return { unread };
  }

  /* ========= Mark document viewed ========= */
  async markDocumentViewed(userId: number, documentId: number) {
    const doc = await this.prisma.taskDocument.findUnique({
      where: { id: documentId },
      select: { id: true, userId: true, status: true, printable: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== userId) throw new ForbiddenException('Not your document');

    let updated = doc;
    if (doc.status === 'NEW') {
      updated = await this.prisma.taskDocument.update({
        where: { id: doc.id },
        data: { status: 'IN_PROGRESS' },
        select: { id: true, userId: true, status: true, printable: true },
      });
    }

    const unread = await this.prisma.taskDocument.count({
      where: { userId, status: 'NEW' },
    });

    return {
      ok: true,
      id: updated.id,
      status: updated.status,
      unread,
      printable: updated.printable,
    };
  }
}