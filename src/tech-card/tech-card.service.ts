import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechCardDto } from './dto/create-tech-card.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Injectable()
export class TechCardService {
    constructor(private prisma: PrismaService) { }

    private async assertMachineMatchesOperation(operationId?: number | null, machineItemId?: number | null) {
        if (!operationId || !machineItemId) return;
        const count = await this.prisma.operation.count({
            where: { id: operationId, machines: { some: { id: machineItemId } } },
        });
        if (count === 0) {
            throw new BadRequestException('Selected machine is not allowed for the chosen operation');
        }
    }

    async create(dto: CreateTechCardDto) {
        // НИКАКОЙ проверки item теперь нет — паспорт независим

        await Promise.all(
            (dto.steps ?? []).map((s) => this.assertMachineMatchesOperation(s.operationId, s.machineItemId)),
        );

        const steps = dto.steps?.map((s, i) => ({
            order: s.order ?? i + 1,
            name: s.name,
            operationId: s.operationId ?? null,
            machineItemId: s.machineItemId ?? null,
            materials: {
                create: (s.materials ?? []).map((m) => ({
                    materialItemId: m.materialItemId,
                    quantity: m.quantity,
                    unitId: m.unitId ?? null,
                })),
            },
            fields: {
                create: (s.fields ?? []).map((f) => ({
                    key: f.key,
                    value: f.value,
                })),
            },
        })) ?? [];

        return this.prisma.techCard.create({
            data: {
                name: dto.name,
                steps: { create: steps },
            },
            include: {
                steps: {
                    include: { materials: true, fields: true, operation: true, machine: true },
                    orderBy: { order: 'asc' },
                },
            },
        });
    }

    async findOne(id: number) {
        const card = await this.prisma.techCard.findUnique({
            where: { id },
            include: {
                steps: {
                    include: {
                        materials: { include: { material: true, unit: true } },
                        fields: true,
                        operation: true,
                        machine: true,
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!card) throw new NotFoundException('TechCard not found');
        return card;
    }

    // Новый список всех паспортов
    async findAll() {
        return this.prisma.techCard.findMany({
            include: {
                steps: {
                    include: { materials: true, fields: true },
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async addStep(techCardId: number, data: {
        name: string;
        operationId?: number;
        machineItemId?: number;
        materials?: { materialItemId: number; quantity: number; unitId?: number }[];
        fields?: { key: string; value: string }[];
    }) {
        const card = await this.prisma.techCard.findUnique({ where: { id: techCardId }, include: { steps: true } });
        if (!card) throw new NotFoundException('TechCard not found');

        await this.assertMachineMatchesOperation(data.operationId, data.machineItemId);

        const nextOrder = (card.steps?.reduce((max, s) => Math.max(max, s.order), 0) ?? 0) + 1;

        return this.prisma.techStep.create({
            data: {
                techCardId,
                order: nextOrder,
                name: data.name,
                operationId: data.operationId ?? null,
                machineItemId: data.machineItemId ?? null,
                materials: {
                    create: (data.materials ?? []).map((m) => ({
                        materialItemId: m.materialItemId,
                        quantity: m.quantity,
                        unitId: m.unitId ?? null,
                    })),
                },
                fields: {
                    create: (data.fields ?? []).map((f) => ({ key: f.key, value: f.value })),
                },
            },
            include: { materials: true, fields: true, operation: true, machine: true },
        });
    }

    async reorderSteps(dto: ReorderStepsDto) {
        const { techCardId, stepIds } = dto;
        const steps = await this.prisma.techStep.findMany({
            where: { techCardId, id: { in: stepIds } },
            select: { id: true },
        });
        if (steps.length !== stepIds.length) {
            throw new NotFoundException('Some steps not found for this TechCard');
        }

        await this.prisma.$transaction(
            stepIds.map((id, idx) =>
                this.prisma.techStep.update({ where: { id }, data: { order: idx + 1 } }),
            ),
        );

        return this.findOne(techCardId);
    }
}