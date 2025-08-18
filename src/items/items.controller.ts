import { Body, Controller, Get, Post, Param, Delete } from '@nestjs/common'; 
import { ItemService } from './items.service';

@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Get(':categoryId')
  getByCategory(@Param('categoryId') categoryId: string) {
    return this.itemService.getByCategory(Number(categoryId));
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
}

