import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  getAll(category?: Category) {
    return this.prisma.item.findMany({
      where: category ? { category } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: { name: string; quantity: number; category: Category; location: string }) {
    return this.prisma.item.create({ data });
  }

  updateQuantity(id: number, quantity: number) {
    return this.prisma.item.update({
      where: { id },
      data: { quantity },
    });
  }

  delete(id: number) {
    return this.prisma.item.delete({ where: { id } });
  }
}
