import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Profile, Category } from '@prisma/client';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

 
  async getAll(): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      include: {
        operations: true, 
      },
      orderBy: { id: 'desc' },
    });
  }


  async create(name: string, operationIds: number[]): Promise<Profile> {
    return this.prisma.profile.create({
      data: {
        name,
        operations: {
          connect: operationIds.map((id) => ({ id })),
        },
      },
      include: { operations: true },
    });
  }

  async updateOperation(profileId: number, operationIds: number[]): Promise<Profile> {
    return this.prisma.profile.update({
      where: { id: profileId },
      data: {
        operations: {
          set: operationIds.map((id) => ({ id })),
        },
      },
      include: { operations: true },
    });
  }

  async delete(id: number): Promise<Profile> {
    return this.prisma.profile.delete({ where: { id } });
  }
}
