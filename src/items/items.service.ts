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
}