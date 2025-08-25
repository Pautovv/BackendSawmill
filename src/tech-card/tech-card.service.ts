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

    async create(dto: CreateTechCardDto) {
        if (!dto.name?.trim()) throw new BadRequestException('Name is required');
        if (!dto.steps || dto.steps.length === 0) {
            throw new BadRequestException('At least one step required');
        }
        const steps = dto.steps;

        // 1) Выполняем транзакцию и возвращаем только ID созданной карты
        const createdId = await this.prisma.$transaction(async (tx) => {
            const card = await tx.techCard.create({
                data: {
                    name: dto.name.trim(),
                    itemId: dto.itemId ?? null,
                },
                select: { id: true },
            });

            let orderCounter = 1;
            for (const s of steps) {
                if (!s.name?.trim()) {
                    throw new BadRequestException(`Step #${orderCounter} name required`);
                }

                if (s.machineNomenclatureId) {
                    await this.assertNomenclature(
                        s.machineNomenclatureId,
                        NomenclatureType.MACHINE,
                    );
                }

                const materialsCreate = s.materials?.length
                    ? s.materials.map((m) => {
                        if (!m.nomenclatureId && !m.materialItemId) {
                            throw new BadRequestException(
                                'Material nomenclatureId or materialItemId required',
                            );
                        }
                        return {
                            nomenclatureId: m.nomenclatureId ?? null,
                            itemId: m.materialItemId ?? null,
                            quantity:
                                m.quantity != null
                                    ? m.quantity
                                    : 1, // если quantity не приходит (мы его убрали на фронте)
                            unitId: m.unitId ?? null,
                        };
                    })
                    : [];

                for (const mc of materialsCreate) {
                    if (mc.nomenclatureId) {
                        await this.assertNomenclature(
                            mc.nomenclatureId,
                            NomenclatureType.MATERIAL,
                        );
                    }
                }

                await tx.techStep.create({
                    data: {
                        techCardId: card.id,
                        order: orderCounter++,
                        name: s.name.trim(),
                        machineItemId: s.machineItemId ?? null,
                        machineNomenclatureId: s.machineNomenclatureId ?? null,
                        operationId: s.operationId ?? null,
                        materials: materialsCreate.length
                            ? { create: materialsCreate }
                            : undefined,
                        fields: s.fields?.length ? { create: s.fields } : undefined,
                    },
                });
            }

            return card.id;
        });

        // 2) Теперь транзакция закоммичена — можно безопасно подтянуть полную сущность
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
                                nomenclature: true,
                                Item: { select: { id: true, name: true } },
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
            await this.assertNomenclature(
                body.machineNomenclatureId,
                NomenclatureType.MACHINE,
            );
        }

        const materialsCreate = body.materials?.length
            ? body.materials.map((m) => {
                if (!m.nomenclatureId && !m.materialItemId) {
                    throw new BadRequestException(
                        'Material nomenclatureId or materialItemId required',
                    );
                }
                return {
                    nomenclatureId: m.nomenclatureId ?? null,
                    itemId: m.materialItemId ?? null,
                    quantity: m.quantity != null ? m.quantity : 1,
                    unitId: m.unitId ?? null,
                };
            })
            : [];

        for (const mc of materialsCreate) {
            if (mc.nomenclatureId) {
                await this.assertNomenclature(
                    mc.nomenclatureId,
                    NomenclatureType.MATERIAL,
                );
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
                materials: materialsCreate.length
                    ? { create: materialsCreate }
                    : undefined,
                fields: body.fields?.length ? { create: body.fields } : undefined,
            },
            include: {
                machineNomenclature: true,
                machine: { select: { id: true, name: true } },
                operation: { select: { id: true, name: true } },
                materials: {
                    include: {
                        nomenclature: true,
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