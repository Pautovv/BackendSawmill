import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function slugify(input: string) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) { }

  async getAll() {
    return this.prisma.category.findMany({
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getByPath(path: string) {
    const category = await this.prisma.category.findUnique({
      where: { path },
      include: { items: true },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    return category;
  }

  async getChildren(parentPath: string | null) {
    if (!parentPath) {
      // корневые
      return this.prisma.category.findMany({
        where: { parentId: null },
        orderBy: { name: 'asc' },
      });
    }
    const parent = await this.prisma.category.findUnique({ where: { path: parentPath } });
    if (!parent) return [];
    return this.prisma.category.findMany({
      where: { parentId: parent.id },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: { name: string; path?: string; parentId?: number; parentPath?: string }) {
    const { name } = data;
    if (!name?.trim()) throw new BadRequestException('name is required');

    // Определяем родителя
    let parentId: number | null = null;
    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new BadRequestException('parentId not found');
      parentId = parent.id;
    } else if (data.parentPath) {
      const parent = await this.prisma.category.findUnique({ where: { path: data.parentPath } });
      if (!parent) throw new BadRequestException('parentPath not found');
      parentId = parent.id;
    }

    const parent = parentId ? await this.prisma.category.findUnique({ where: { id: parentId } }) : null;

    // Совместимость: если прислали path без слешей — трактуем как slug; иначе игнорируем как slug
    let slug: string;
    if (data.path && !data.path.includes('/')) {
      slug = slugify(data.path);
    } else {
      slug = slugify(name);
    }

    const fullPath = parent ? `${parent.path}/${slug}` : slug;

    const exists = await this.prisma.category.findUnique({ where: { path: fullPath } });
    if (exists) throw new BadRequestException('Category with this path already exists');

    return this.prisma.category.create({
      data: {
        name,
        slug,
        path: fullPath,
        parentId: parent?.id ?? null,
      },
    });
  }

  async delete(id: number) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { items: true, children: true },
    });
    if (!cat) throw new BadRequestException('Category not found');

    if ((cat.children?.length ?? 0) > 0) {
      throw new BadRequestException('Cannot delete category with subcategories');
    }
    if ((cat.items?.length ?? 0) > 0) {
      throw new BadRequestException('Cannot delete category with items');
    }

    return this.prisma.category.delete({ where: { id } });
  }

  async listAvailable(excludePaths: string[] = ['станки', 'инструмент']) {
    const notConds = (excludePaths || [])
      .filter(Boolean)
      .map((p) => ({ path: { startsWith: p } }));
    return this.prisma.category.findMany({
      where: notConds.length ? { NOT: notConds } : undefined,
      orderBy: { name: 'asc' },
    });
  }
}