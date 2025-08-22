import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CategoryService } from './category.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  // Плоский список (можно оставить для совместимости)
  @Get()
  getAll() {
    return this.categoryService.getAll();
  }

  // Дети по parentPath (если не передан — корни)
  @Get('children')
  getChildren(@Query('parentPath') parentPath?: string) {
    return this.categoryService.getChildren(parentPath || null);
  }

  // Категория по полному path
  @Get('by-path')
  getByPath(@Query('path') path?: string) {
    if (!path) throw new BadRequestException('path is required');
    return this.categoryService.getByPath(path);
  }

  // Создать категорию / подкатегорию
  // Поддерживает: name + parentPath (рекомендовано), либо name + parentId
  // Для совместимости: можно передать path без слешей как явный slug (для корня)
  @Post()
  create(@Body() body: { name: string; path?: string; parentId?: number; parentPath?: string }) {
    return this.categoryService.create(body);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.delete(id);
  }

  @Get('available')
  listAvailable(@Query('exclude') exclude?: string) {
    const excludePaths = (exclude ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return this.categoryService.listAvailable(
      excludePaths.length ? excludePaths : ['станки', 'инструмент'],
    );
  }
}