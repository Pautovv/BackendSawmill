import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, ParseIntPipe } from '@nestjs/common';
import { ItemService } from './items.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService, private readonly prisma: PrismaService,) { }

  @Get('by-category/:id')
  getByCategoryId(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.getByCategory(id);
  }

  @Get('by-category')
  async getByCategoryPath(@Query('categoryPath') categoryPath?: string) {
    if (!categoryPath) {
      throw new BadRequestException('categoryPath is required');
    }
    const category = await this.prisma.category.findUnique({
      where: { path: categoryPath },
      select: { id: true },
    });
    if (!category) {
      return [];
    }
    return this.itemService.getByCategory(category.id);
  }

  @Post()
  create(@Body() body: { categoryId: number; name: string; fields: { key: string; value: string }[] }) {
    return this.itemService.create(body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.itemService.delete(Number(id));
  }

  @Post(':id/fields')
  addField(@Param('id') itemId: string, @Body() body: { key: string; value: string }) {
    return this.itemService.addField(Number(itemId), body);
  }

  @Delete(':itemId/fields/:fieldId')
  deleteField(@Param('itemId') itemId: string, @Param('fieldId') fieldId: string) {
    return this.itemService.deleteField(Number(fieldId));
  }

  @Get('available')
  listAvailable(@Query('exclude') exclude?: string) {
    const excludePaths = (exclude ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return this.itemService.listAvailable(
      excludePaths.length ? excludePaths : ['станки', 'инструмент'],
    );
  }
}