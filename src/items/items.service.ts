import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    }) {
        if (!data.name?.trim()) throw new BadRequestException('name required');
        if (!data.warehouseId) throw new BadRequestException('warehouseId required');
        if (!data.shelfId) throw new BadRequestException('shelfId required');

        const shelf = await this.prisma.shelf.findUnique({
            where: { id: data.shelfId },
        });
        if (!shelf) throw new BadRequestException('shelf not found');
        if (shelf.warehouseId !== data.warehouseId) {
            throw new BadRequestException('shelf belongs to another warehouse');
        }

        return this.prisma.item.create({
            data: {
                categoryId: data.categoryId,
                name: data.name.trim(),
                warehouseId: data.warehouseId,
                shelfId: data.shelfId,
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
}