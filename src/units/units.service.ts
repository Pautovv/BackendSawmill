import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
    constructor(private prisma: PrismaService) { }

    async listByCategoryPath(categoryPath: string) {
        const category = await this.prisma.category.findUnique({ where: { path: categoryPath } });
        if (!category) return [];
        return this.prisma.unit.findMany({
            where: { categoryId: category.id },
            orderBy: { unit: 'asc' },
        });
    }

    async listAvailableByExcludePaths(excludePaths: string[] = ['machines', 'tools']) {
        const notConds = (excludePaths || [])
            .filter(Boolean)
            .map((p) => ({ path: { startsWith: p } }));
        const allowedCats = await this.prisma.category.findMany({
            where: notConds.length ? { NOT: notConds } : undefined,
            select: { id: true },
        });
        const allowedIds = allowedCats.map((c) => c.id);
        return this.prisma.unit.findMany({
            where: { categoryId: { in: allowedIds } },
            orderBy: { unit: 'asc' },
        });
    }
}