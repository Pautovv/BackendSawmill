import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehousesService {
    constructor(private prisma: PrismaService) { }

    list(withShelves = false) {
        return this.prisma.warehouse.findMany({
            orderBy: { name: 'asc' },
            include: withShelves ? { shelves: { orderBy: { name: 'asc' } } } : undefined,
        });
    }

    async create(name: string) {
        const n = name?.trim();
        if (!n) throw new BadRequestException('name required');
        return this.prisma.warehouse.create({ data: { name: n } });
    }

    async remove(id: number) {
        const count = await this.prisma.item.count({ where: { warehouseId: id } });
        if (count > 0) throw new BadRequestException('Есть привязанные предметы');
        await this.prisma.warehouse.delete({ where: { id } });
        return { ok: true };
    }

    async createShelf(warehouseId: number, name: string) {
        const n = name?.trim();
        if (!n) throw new BadRequestException('shelf name required');
        const wh = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
        if (!wh) throw new NotFoundException('warehouse not found');
        return this.prisma.shelf.create({ data: { warehouseId, name: n } });
    }

    listShelves(warehouseId: number) {
        return this.prisma.shelf.findMany({
            where: { warehouseId },
            orderBy: { name: 'asc' },
        });
    }

    async removeShelf(id: number) {
        const count = await this.prisma.item.count({ where: { shelfId: id } });
        if (count > 0) throw new BadRequestException('Есть предметы на полке');
        await this.prisma.shelf.delete({ where: { id } });
        return { ok: true };
    }
}