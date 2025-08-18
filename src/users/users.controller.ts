import { Controller, Get, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
export class UsersController {
    constructor(private prisma: PrismaService) { }

    @Get()
    list(@Query('search') search?: string) {
        const where: Prisma.UserWhereInput | undefined = search
            ? {
                OR: [
                    { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                    { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                    { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
                    { role: { contains: search, mode: Prisma.QueryMode.insensitive } },
                ],
            }
            : undefined;

        return this.prisma.user.findMany({
            where,
            select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
    }
}