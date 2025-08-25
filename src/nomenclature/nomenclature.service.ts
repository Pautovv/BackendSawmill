import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NomenclatureType, Prisma } from '@prisma/client';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';

const ALLOWED_TYPES: NomenclatureType[] = [
    NomenclatureType.MACHINE,
    NomenclatureType.MATERIAL,
];

@Injectable()
export class NomenclatureService {
    constructor(private prisma: PrismaService) { }

    create(dto: CreateNomenclatureDto) {
        if (!dto.name?.trim()) throw new BadRequestException('Empty name');
        if (!ALLOWED_TYPES.includes(dto.type)) {
            throw new BadRequestException('This nomenclature type is not allowed (only MACHINE, MATERIAL)');
        }
        return this.prisma.nomenclature.create({
            data: {
                type: dto.type,
                name: dto.name.trim(),
                isActive: dto.isActive ?? true,
            },
        });
    }

    search(type: NomenclatureType, search?: string, limit = 20) {
        if (!ALLOWED_TYPES.includes(type)) {
            // Возвращаем пустой массив, чтобы фронт не видел чужое
            return [];
        }
        const where: Prisma.NomenclatureWhereInput = {
            type,
            isActive: true,
            ...(search
                ? { name: { contains: search, mode: 'insensitive' } }
                : {}),
        };
        return this.prisma.nomenclature.findMany({
            where,
            take: limit,
            orderBy: { name: 'asc' },
        });
    }
}