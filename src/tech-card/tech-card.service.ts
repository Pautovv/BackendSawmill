import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechCardDto } from './dto/create-tech-card.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { AddTechStepDto } from './dto/add-step.dto';
import { NomenclatureType } from '@prisma/client';

@Injectable()
export class TechCardService {
    constructor(private prisma: PrismaService) { }

    private async assertNomenclature(id: number, expected: NomenclatureType) {
        const n = await this.prisma.nomenclature.findUnique({ where: { id } });
        if (!n) throw new BadRequestException('Nomenclature not found');
        if (n.type !== expected) {
            throw new BadRequestException(
                `Nomenclature type mismatch: expected ${expected}, got ${n.type}`,
            );
        }
        return n;
    }

    private buildMaterials(materials: AddTechStepDto['materials']) {
        return (materials || []).map(m => {
            if (!m.itemId && !m.nomenclatureId) {
                throw new BadRequestException('Material itemId или nomenclatureId обязателен');
            }
            const data: any = {};
            if (m.itemId) data.Item = { connect: { id: m.itemId } };
            if (m.nomenclatureId) data.nomenclature = { connect: { id: m.nomenclatureId } };
            if (m.unitId) data.unit = { connect: { id: m.unitId } };
            return data;
        });
    }

    async create(dto: CreateTechCardDto) {
        if (!dto.name?.trim()) throw new BadRequestException('Name is required');
        if (!dto.steps?.length) throw new BadRequestException('At least one step required');

        const createdId = await this.prisma.$transaction(async tx => {
            const card = await tx.techCard.create({
                data: {
                    name: dto.name.trim(),
                    itemId: dto.itemId ?? null,
                },
                select: { id: true },
            });

            let order = 1;
            for (const s of dto.steps) {
                if (!s.name?.trim())
                    throw new BadRequestException(`Step #${order} name required`);

                if (s.machineNomenclatureId) {
                    await this.assertNomenclature(s.machineNomenclatureId, NomenclatureType.MACHINE);
                }

                const materialsCreate = this.buildMaterials(s.materials || []);

                for (const mc of materialsCreate) {
                    if (mc.nomenclature?.connect?.id) {
                        await this.assertNomenclature(mc.nomenclature.connect.id, NomenclatureType.MATERIAL);
                    }
                }

                await tx.techStep.create({
                    data: {
                        techCardId: card.id,
                        order: order++,
                        name: s.name.trim(),
                        machineItemId: s.machineItemId ?? null,
                        machineNomenclatureId: s.machineNomenclatureId ?? null,
                        operationId: s.operationId ?? null,
                        materials: materialsCreate.length ? { create: materialsCreate } : undefined,
                        fields: s.fields?.length ? { create: s.fields } : undefined,
                    },
                });
            }

            return card.id;
        });

        return this.findOne(createdId);
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
                        machine: { select: { id: true, name: true } },
                        machineNomenclature: true,
                        operation: { select: { id: true, name: true } },
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
                                nomenclature: true,
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

    async addStep(techCardId: number, body: AddTechStepDto) {
        if (!body.name?.trim()) throw new BadRequestException('Step name required');

        const maxOrder = await this.prisma.techStep.aggregate({
            where: { techCardId },
            _max: { order: true },
        });

        if (body.machineNomenclatureId) {
            await this.assertNomenclature(body.machineNomenclatureId, NomenclatureType.MACHINE);
        }

        const materialsCreate = this.buildMaterials(body.materials || []);
        for (const mc of materialsCreate) {
            if (mc.nomenclature?.connect?.id) {
                await this.assertNomenclature(mc.nomenclature.connect.id, NomenclatureType.MATERIAL);
            }
        }

        return this.prisma.techStep.create({
            data: {
                techCardId,
                order: (maxOrder._max.order ?? 0) + 1,
                name: body.name.trim(),
                machineItemId: body.machineItemId ?? null,
                machineNomenclatureId: body.machineNomenclatureId ?? null,
                operationId: body.operationId ?? null,
                materials: materialsCreate.length ? { create: materialsCreate } : undefined,
                fields: body.fields?.length ? { create: body.fields } : undefined,
            },
            include: {
                machineNomenclature: true,
                machine: { select: { id: true, name: true } },
                operation: { select: { id: true, name: true } },
                materials: {
                    include: {
                        Item: { select: { id: true, name: true, quantity: true, fields: true } },
                        nomenclature: true,
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