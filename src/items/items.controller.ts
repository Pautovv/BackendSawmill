import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ItemService } from './items.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('items')
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    private readonly prisma: PrismaService,
  ) { }

  @Get('by-category/:id')
  getByCategoryId(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.getByCategory(id);
  }

  @Get('by-category')
  async getByCategoryPath(@Query('categoryPath') categoryPath?: string) {
    if (!categoryPath) throw new BadRequestException('categoryPath is required');
    const category = await this.prisma.category.findUnique({
      where: { path: categoryPath },
      select: { id: true },
    });
    if (!category) return [];
    return this.itemService.getByCategory(category.id);
  }

  @Post()
  create(
    @Body()
    body: {
      categoryId: number;
      name: string;
      fields: { key: string; value: string }[];
      warehouseId: number;
      shelfId: number;
      quantity: number; // теперь ОБЯЗАТЕЛЬНО
    },
  ) {
    if (body.quantity == null) {
      throw new BadRequestException('quantity required');
    }
    return this.itemService.create(body);
  }

  @Patch(':id')
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { warehouseId?: number; shelfId?: number },
  ) {
    if (body.warehouseId == null || body.shelfId == null) {
      throw new BadRequestException('warehouseId & shelfId required');
    }
    return this.itemService.move(id, body.warehouseId, body.shelfId);
  }

  @Patch(':id/move')
  move(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { warehouseId: number; shelfId: number },
  ) {
    return this.itemService.move(id, body.warehouseId, body.shelfId);
  }

  @Patch(':id/quantity')
  updateQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { quantity: number },
  ) {
    if (body.quantity == null) throw new BadRequestException('quantity required');
    return this.itemService.setQuantity(id, body.quantity);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.itemService.delete(id);
  }

  @Post(':id/fields')
  addField(
    @Param('id', ParseIntPipe) itemId: number,
    @Body() body: { key: string; value: string },
  ) {
    return this.itemService.addField(itemId, body);
  }

  @Delete(':itemId/fields/:fieldId')
  deleteField(@Param('fieldId', ParseIntPipe) fieldId: number) {
    return this.itemService.deleteField(fieldId);
  }
}