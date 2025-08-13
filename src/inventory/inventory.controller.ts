import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Category } from '@prisma/client';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getAll(@Query('category') category?: Category) {
    return this.inventoryService.getAll(category);
  }

  @Post()
  create(@Body() body: { name: string; quantity: number; category: Category; location: string }) {
    return this.inventoryService.create(body);
  }

  @Put(':id/quantity')
  updateQuantity(@Param('id') id: string, @Body() body: { quantity: number }) {
    return this.inventoryService.updateQuantity(Number(id), body.quantity);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.inventoryService.delete(Number(id));
  }
}
