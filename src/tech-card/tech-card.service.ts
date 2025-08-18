import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechCardDto } from './dto/create-tech-card.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Injectable()
export class TechCardService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateTechCardDto) {
        // твоя логика создания как была
        return this.prisma.techCard.create({
            data: {
                name: dto.name,
                itemId: dto.itemId ?? null,
            },
        });
    }

    // ДОБАВЛЕНО: поиск по названию
    async findAll(search?: string) {
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

    // ОБНОВЛЕНО: отдаём шаги, операции, станок, материалы и поля шага
    async findOne(id: number) {
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

    async addStep(
        techCardId: number,
        body: {
            name: string;
            operationId?: number;
            machineItemId?: number;
            materials?: { materialItemId: number; quantity: number; unitId?: number }[];
            fields?: { key: string; value: string }[];
        },
    ) {
        const maxOrder = await this.prisma.techStep.aggregate({
            where: { techCardId },
            _max: { order: true },
        });

        return this.prisma.techStep.create({
            data: {
                techCardId,
                name: body.name,
                order: (maxOrder._max.order ?? 0) + 1,
                operationId: body.operationId ?? null,
                machineItemId: body.machineItemId ?? null,
                materials: body.materials?.length
                    ? {
                        create: body.materials.map((m) => ({
                            materialItemId: m.materialItemId,
                            quantity: m.quantity,
                            unitId: m.unitId ?? null,
                        })),
                    }
                    : undefined,
                fields: body.fields?.length ? { create: body.fields } : undefined,
            },
            include: {
                operation: { select: { id: true, name: true } },
                machine: { select: { id: true, name: true } },
                materials: true,
                fields: true,
            },
        });
    }

    async reorderSteps(dto: ReorderStepsDto) {
        const { techCardId, stepIds } = dto;
        // простая перестановка с транзакцией
        await this.prisma.$transaction(
            stepIds.map((id, idx) =>
                this.prisma.techStep.update({
                    where: { id },
                    data: { order: idx + 1 },
                }),
            ),
        );
        return this.findOne(techCardId);
    }
}