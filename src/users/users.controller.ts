import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Query,
    Req,
    ForbiddenException,
    UnauthorizedException,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { type Request as request } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private prisma: PrismaService) { }

    private getActorId(req: any): number {
        const id = req?.user?.userId;
        if (!id) throw new UnauthorizedException('Не авторизован');
        return id;
    }

    @Get()
    async list(@Req() req: request, @Query('search') search?: string) {

        let where: Prisma.UserWhereInput | undefined;
        if (search) {
            const s = search.trim();
            where = {
                OR: [
                    { firstName: { contains: s, mode: 'insensitive' } },
                    { lastName: { contains: s, mode: 'insensitive' } },
                    { email: { contains: s, mode: 'insensitive' } },
                    ...(Object.values(UserRole).includes(s.toUpperCase() as UserRole)
                        ? [{ role: s.toUpperCase() as UserRole }]
                        : []),
                ],
            };
        }

        return this.prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                responsibleWarehouses: { select: { id: true, name: true } },
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
    }

    @Patch(':id/role')
    async updateRole(
        @Req() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserRoleDto,
    ) {
        const actorId = this.getActorId(req);
        const actor = await this.prisma.user.findUnique({
            where: { id: actorId },
            select: { role: true },
        });
        if (actor?.role !== 'ADMIN')
            throw new ForbiddenException('Только администратор может менять роли');

        const target = await this.prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });
        if (!target) throw new BadRequestException('Пользователь не найден');

        // Защита от снятия последнего администратора
        if (dto.role !== 'ADMIN' && target.role === 'ADMIN') {
            const adminCount = await this.prisma.user.count({
                where: { role: 'ADMIN' },
            });
            if (adminCount <= 1) {
                throw new ForbiddenException(
                    'Нельзя лишить роли последнего администратора',
                );
            }
        }

        // Если пользователь БЫЛ кладовщиком и мы меняем его роль на другую — освобождаем его склады
        if (target.role === 'WAREHOUSE' && dto.role !== 'WAREHOUSE') {
            await this.prisma.warehouse.updateMany({
                where: { responsibleId: id },
                data: { responsibleId: null },
            });
        }

        // Назначение роли WAREHOUSE (или повторное назначение с другим складом)
        if (dto.role === 'WAREHOUSE') {
            if (!dto.warehouseId) {
                throw new BadRequestException(
                    'warehouseId обязателен для роли WAREHOUSE',
                );
            }

            const warehouse = await this.prisma.warehouse.findUnique({
                where: { id: dto.warehouseId },
                select: { id: true, responsibleId: true },
            });
            if (!warehouse) throw new BadRequestException('Склад не найден');

            // Если НЕ хочешь перезаписывать уже назначенного ответственного — раскомментируй:
            // if (warehouse.responsibleId && warehouse.responsibleId !== id) {
            //   throw new BadRequestException('У склада уже есть ответственный');
            // }

            // (Опционально) если хочешь чтобы один пользователь мог быть ответственным ТОЛЬКО за один склад:
            // await this.prisma.warehouse.updateMany({
            //   where: { responsibleId: id },
            //   data: { responsibleId: null },
            // });

            // Сделаем в одной транзакции (чтобы не было race condition)
            await this.prisma.$transaction([
                this.prisma.user.update({
                    where: { id },
                    data: { role: 'WAREHOUSE' },
                }),
                this.prisma.warehouse.update({
                    where: { id: warehouse.id },
                    data: { responsibleId: id },
                }),
            ]);

            return { id, role: 'WAREHOUSE' };
        }

        // Любая другая роль
        return this.prisma.user.update({
            where: { id },
            data: { role: dto.role },
            select: { id: true, role: true },
        });
    }

    /* ===== Доп. эндпоинты (если захочешь управлять складами отдельно) =====
    @Patch(':id/assign-warehouse')
    async assignWarehouse(
      @Req() req,
      @Param('id', ParseIntPipe) userId: number,
      @Body() body: { warehouseId: number },
    ) {
      const actorId = this.getActorId(req);
      const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (actor?.role !== 'ADMIN') throw new ForbiddenException();
  
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!user) throw new BadRequestException('Пользователь не найден');
  
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: body.warehouseId },
        select: { id: true },
      });
      if (!warehouse) throw new BadRequestException('Склад не найден');
  
      // Если нужно автоматически дать роль WAREHOUSE:
      if (user.role !== 'WAREHOUSE' && user.role !== 'ADMIN') {
        await this.prisma.user.update({ where: { id: userId }, data: { role: 'WAREHOUSE' } });
      }
  
      await this.prisma.warehouse.update({
        where: { id: warehouse.id },
        data: { responsibleId: userId },
      });
  
      return { ok: true };
    }
  
    @Patch(':id/unassign-warehouse')
    async unassignWarehouse(
      @Req() req,
      @Param('id', ParseIntPipe) userId: number,
      @Body() body: { warehouseId: number },
    ) {
      const actorId = this.getActorId(req);
      const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (actor?.role !== 'ADMIN') throw new ForbiddenException();
  
      await this.prisma.warehouse.updateMany({
        where: { id: body.warehouseId, responsibleId: userId },
        data: { responsibleId: null },
      });
  
      return { ok: true };
    }
    */
}
