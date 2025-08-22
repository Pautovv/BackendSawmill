import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTechCardDto } from './dto/create-tech-card.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Injectable()
export class TechCardService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateTechCardDto) {
        return this.prisma.techCard.create({
            data: {
                name: dto.name,
                itemId: dto.itemId ?? null,
            },
        });
    }

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

    async addStep(
        techCardId: number,
        body: {
            name: string;
            operationId?: number;
            machineItemId?: number;
            materials?: { materialItemId: number; quantity: number; unitId?: number }[]; // было materialItemId
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
                            itemId: m.materialItemId, // было materialItemId
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
                materials: {
                    include: {
                        Item: { select: { id: true, name: true } },
                        unit: { select: { id: true, unit: true } },
                    },
                },
                fields: true,
            },
        });
    }

    async reorderSteps(dto: ReorderStepsDto) {
        const { techCardId, stepIds } = dto;
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