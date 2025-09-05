import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isWoodCategoryName } from '../utils/category-type.util';

@Injectable()
export class ItemService {
    constructor(private prisma: PrismaService) { }

    private warehouseInclude() {
        return {
            include: {
                responsible: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        };
    }

    async getCategory(id: number) {
        const cat = await this.prisma.category.findUnique({ where: { id } });
        if (!cat) throw new BadRequestException('category not found');
        return cat;
    }

    getByCategory(categoryId: number) {
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            throw new BadRequestException('categoryId invalid');
        }
        return this.prisma.item.findMany({
            where: { categoryId },
            include: {
                fields: true,
                warehouse: this.warehouseInclude(),
                shelf: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    async create(data: {
        categoryId: number;
        name: string;
        fields: { key: string; value: string }[];
        warehouseId: number;
        shelfId: number;
        quantity: number;
    }) {
        if (!data.name?.trim()) throw new BadRequestException('name required');
        if (!data.warehouseId) throw new BadRequestException('warehouseId required');
        if (!data.shelfId) throw new BadRequestException('shelfId required');
        if (data.quantity == null) throw new BadRequestException('quantity required');
        if (data.quantity < 0) throw new BadRequestException('quantity must be >= 0');

        const shelf = await this.prisma.shelf.findUnique({
            where: { id: data.shelfId },
        });
        if (!shelf) throw new BadRequestException('shelf not found');
        if (shelf.warehouseId !== data.warehouseId) {
            throw new BadRequestException('shelf belongs to another warehouse');
        }

        const category = await this.getCategory(data.categoryId);
        const isWood = isWoodCategoryName(category.name, category.path);

        // Валидация обязательных полей для древесных категорий
        if (isWood) {
            const lowerFields = data.fields.map(f => ({ ...f, keyLower: f.key.toLowerCase() }));
            const hasBreed = lowerFields.some(f => ['порода', 'breed'].includes(f.keyLower));
            const hasSize = lowerFields.some(f => ['размер', 'size'].includes(f.keyLower));
            if (!hasBreed) throw new BadRequestException('Поле "Порода" обязательно для этой категории');
            if (!hasSize) throw new BadRequestException('Поле "Размер" обязательно для этой категории');
        }

        return this.prisma.item.create({
            data: {
                categoryId: data.categoryId,
                name: data.name.trim(),
                warehouseId: data.warehouseId,
                shelfId: data.shelfId,
                quantity: data.quantity,
                fields: {
                    create:
                        data.fields?.map((f) => ({
                            key: f.key.trim(),
                            value: f.value.trim(),
                        })) ?? [],
                },
            },
            include: {
                fields: true,
                warehouse: this.warehouseInclude(),
                shelf: true,
            },
        });
    }

    delete(id: number) {
        return this.prisma.item.delete({ where: { id } });
    }

    addField(itemId: number, field: { key: string; value: string }) {
        if (!field.key?.trim()) {
            throw new BadRequestException('key required');
        }
        return this.prisma.itemField.create({
            data: {
                itemId,
                key: field.key.trim(),
                value: (field.value ?? '').trim(),
            },
        });
    }

    deleteField(fieldId: number) {
        return this.prisma.itemField.delete({ where: { id: fieldId } });
    }

    async move(itemId: number, warehouseId: number, shelfId: number) {
        if (!warehouseId) throw new BadRequestException('warehouseId required');
        if (!shelfId) throw new BadRequestException('shelfId required');

        const item = await this.prisma.item.findUnique({
            where: { id: itemId },
        });
        if (!item) throw new NotFoundException('item not found');

        const shelf = await this.prisma.shelf.findUnique({
            where: { id: shelfId },
        });
        if (!shelf) throw new BadRequestException('shelf not found');
        if (shelf.warehouseId !== warehouseId) {
            throw new BadRequestException('shelf and warehouse mismatch');
        }

        return this.prisma.item.update({
            where: { id: itemId },
            data: { warehouseId, shelfId },
            include: {
                fields: true,
                warehouse: this.warehouseInclude(),
                shelf: true,
            },
        });
    }

    async setQuantity(itemId: number, quantity: number) {
        if (quantity < 0) throw new BadRequestException('quantity must be >= 0');
        const item = await this.prisma.item.findUnique({ where: { id: itemId } });
        if (!item) throw new NotFoundException('item not found');
        return this.prisma.item.update({
            where: { id: itemId },
            data: { quantity },
            include: {
                fields: true,
                warehouse: this.warehouseInclude(),
                shelf: true,
            },
        });
    }

    /**
     * Частичное перемещение части количества.
     * Возвращает:
     * {
     *   source: обновлённый исходный item,
     *   target: новый или увеличенный целевой item
     * }
     */
    async movePartial(itemId: number, warehouseId: number, shelfId: number, quantity: number) {
        if (!warehouseId) throw new BadRequestException('warehouseId required');
        if (!shelfId) throw new BadRequestException('shelfId required');
        if (quantity == null) throw new BadRequestException('quantity required');
        if (quantity <= 0) throw new BadRequestException('quantity must be > 0');

        const shelf = await this.prisma.shelf.findUnique({ where: { id: shelfId } });
        if (!shelf) throw new BadRequestException('shelf not found');
        if (shelf.warehouseId !== warehouseId) {
            throw new BadRequestException('shelf and warehouse mismatch');
        }

        return this.prisma.$transaction(async (tx) => {
            const source = await tx.item.findUnique({
                where: { id: itemId },
                include: { fields: true },
            });
            if (!source) throw new NotFoundException('item not found');

            if (source.quantity < quantity) {
                throw new BadRequestException('not enough quantity');
            }

            // Полное перемещение – просто переиспользуем move
            if (source.quantity === quantity) {
                const moved = await tx.item.update({
                    where: { id: source.id },
                    data: { warehouseId, shelfId },
                    include: {
                        fields: true,
                        warehouse: this.warehouseInclude(),
                        shelf: true,
                    },
                });
                return { source: moved, target: moved, fullMove: true };
            }

            // Частичное. Попытаемся найти совместимый целевой.
            // Критерий: такое же name + categoryId + (совпадающий набор полей по key/value).
            // Если нужен другой критерий — скорректируй.
            const candidateItems = await tx.item.findMany({
                where: {
                    name: source.name,
                    categoryId: source.categoryId,
                    warehouseId,
                    shelfId,
                },
                include: { fields: true },
            });

            const normalizeFields = (fs: { key: string; value: string }[]) =>
                [...fs]
                    .map(f => ({ k: f.key.trim().toLowerCase(), v: f.value.trim() }))
                    .sort((a, b) => (a.k + a.v).localeCompare(b.k + b.v));

            const sourceNorm = normalizeFields(source.fields);

            let target = candidateItems.find(ci => {
                const ciNorm = normalizeFields(ci.fields);
                if (ciNorm.length !== sourceNorm.length) return false;
                return ciNorm.every((f, i) => f.k === sourceNorm[i].k && f.v === sourceNorm[i].v);
            });

            // Уменьшаем исходный
            const updatedSource = await tx.item.update({
                where: { id: source.id },
                data: { quantity: source.quantity - quantity },
                include: {
                    fields: true,
                    warehouse: this.warehouseInclude(),
                    shelf: true,
                },
            });

            if (target) {
                // Увеличиваем существующий целевой
                target = await tx.item.update({
                    where: { id: target.id },
                    data: { quantity: target.quantity + quantity },
                    include: {
                        fields: true,
                        warehouse: this.warehouseInclude(),
                        shelf: true,
                    },
                });
            } else {
                // Создаём новый целевой
                target = await tx.item.create({
                    data: {
                        name: source.name,
                        categoryId: source.categoryId,
                        warehouseId,
                        shelfId,
                        quantity,
                        fields: {
                            create: source.fields.map(f => ({
                                key: f.key,
                                value: f.value,
                            })),
                        },
                    },
                    include: {
                        fields: true,
                        warehouse: this.warehouseInclude(),
                        shelf: true,
                    },
                });
            }

            return { source: updatedSource, target, fullMove: false };
        });
    }
}