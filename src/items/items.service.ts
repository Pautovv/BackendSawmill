import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemService {
    constructor(private prisma: PrismaService) { }

    async getByCategory(categoryId: number) {
        return this.prisma.item.findMany({
            where: { categoryId },
            include: { fields: true },
        });
    }

    async create(data: { categoryId: number; name: string; fields: { key: string; value: string }[] }) {
        return this.prisma.item.create({
            data: {
                categoryId: data.categoryId,
                name: data.name,
                fields: {
                    create: data.fields,
                },
            },
            include: { fields: true },
        });
    }

    async delete(id: number) {
        return this.prisma.item.delete({ where: { id } });
    }

    async addField(itemId: number, field: { key: string; value: string }) {
        return this.prisma.itemField.create({
            data: { itemId, ...field },
        });
    }

    async deleteField(fieldId: number) {
        return this.prisma.itemField.delete({ where: { id: fieldId } });
    }
}
