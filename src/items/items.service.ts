import { Injectable, BadRequestException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemService {
    constructor(private prisma: PrismaService) { }

    async getByCategory(categoryId: number) {
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            throw new BadRequestException('categoryId is required and must be a positive integer');
        }

        return this.prisma.item.findMany({
            where: { categoryId },          
            include: { fields: true },
            orderBy: { name: 'asc' },
        });
    }

    async getByCategoryQuery(args: { categoryName?: string; categoryPath?: string }) {
        const { categoryName, categoryPath } = args;

        const categoryWhere = categoryPath
            ? { path: { equals: categoryPath, mode: 'insensitive' as const } }
            : { name: { equals: categoryName!, mode: 'insensitive' as const } };

        return this.prisma.item.findMany({
            where: { category: categoryWhere },
            include: { fields: true },
            orderBy: { id: 'desc' },
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

    async listAvailable(excludePaths: string[] = ['станки', 'инструмент']) {
        const notConds = (excludePaths || [])
            .filter(Boolean)
            .map((p) => ({ path: { startsWith: p } }));

        const allowedCats = await this.prisma.category.findMany({
            where: notConds.length ? { NOT: notConds } : undefined,
            select: { id: true, name: true, path: true },
        });
        const allowedIds = allowedCats.map((c) => c.id);

        return this.prisma.item.findMany({
            where: allowedIds.length ? { categoryId: { in: allowedIds } } : undefined,
            orderBy: { name: 'asc' },
            include: { category: true },
        });
    }
}