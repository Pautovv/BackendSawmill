import { Body, Controller, Get, Post, Param, Delete } from '@nestjs/common'; 
import { CategoryService } from './category.service'; 
@Controller('categories')
 export class CategoryController { 
  constructor(private readonly categoryService: CategoryService) {} 
  
  @Get() 
  getAll() { 
    return this.categoryService.getAll(); 
  } 
  @Post() 
  create(@Body() body: { name: string; path: string }) { 
    return this.categoryService.create(body); 
  } 
  @Delete(':id') delete(@Param('id') id: string) { 
    return this.categoryService.delete(Number(id)); 
  } 
}