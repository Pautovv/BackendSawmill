import { Injectable } from '@nestjs/common'; 
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable() 
export class CategoryService { 
  constructor(private prisma: PrismaService) {} 
  
  async getAll() { 
    return this.prisma.category.findMany({ 
      include: { items: true }, 
      orderBy: { createdAt: 'asc' }, 
    }); 
  } 
  
  async create(data: { name: string; path: string }) { 
    return this.prisma.category.create({ data }); 
  } 
  
  async delete(id: number) { 
    return this.prisma.category.delete({ where: { id } }); 
  } 
}