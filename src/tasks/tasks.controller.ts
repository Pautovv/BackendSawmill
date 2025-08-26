import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UseGuards,
    ForbiddenException,
    Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTaskBody {
    techCardId: number;
    name?: string;
    fields?: { key: string; value: string }[];
    assignments: Array<{
        stepId: number;
        plannedQuantity?: number;
        leadUserIds: number[];
        memberUserIds: number[];
    }>;
    preGeneratePdfs?: boolean;
}

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
    constructor(
        private readonly service: TasksService,
        private readonly prisma: PrismaService,
    ) { }

    private async getRole(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        return user?.role;
    }

    private getActorId(req: any): number {
        const user = req?.user || {};
        const id = user.userId || user.id || user.sub;
        if (!id) throw new ForbiddenException('Не авторизован');
        return Number(id);
    }

    // Сейчас запрещаем только SELLER. Если нужно запретить ещё WAREHOUSE – добавь || role === 'WAREHOUSE'
    private async assertNotSeller(userId: number) {
        const role = await this.getRole(userId);
        if (role === 'SELLER') {
            throw new ForbiddenException('Недоступно для роли SELLER');
        }
        return role;
    }

    /* ====== Выдача заданий (админ / разрешённые роли) ====== */

    @Get('tech-cards')
    async listTechCards(@Req() req, @Query('search') search?: string) {
        const actorId = this.getActorId(req);
        await this.assertNotSeller(actorId);
        return this.service.listTechCards(search);
    }

    @Get('tech-cards/:id')
    async getTechCard(@Req() req, @Param('id', ParseIntPipe) id: number) {
        const actorId = this.getActorId(req);
        await this.assertNotSeller(actorId);
        return this.service.getTechCardDetails(id);
    }

    @Get('assignable-users')
    async listAssignableUsers(@Req() req, @Query('q') q?: string) {
        const actorId = this.getActorId(req);
        await this.assertNotSeller(actorId);
        return this.service.listAssignableUsers(q);
    }

    @Post()
    async createTask(@Req() req, @Body() body: CreateTaskBody) {
        const actorId = this.getActorId(req);
        await this.assertNotSeller(actorId);
        return this.service.createTaskWithDocuments(body);
    }

    /* ====== Общие "мои задания" (для всех назначенных) ====== */

    @Get('my')
    async myTasks(@Req() req) {
        const actorId = this.getActorId(req);
        return this.service.listMyTasks(actorId);
    }

    @Get('my/:id')
    async myTaskDetails(@Req() req, @Param('id', ParseIntPipe) id: number) {
        const actorId = this.getActorId(req);
        return this.service.getMyTaskDetails(id, actorId);
    }

    @Post('my/steps/:stepAssignmentId/result')
    async submitStepResult(
        @Req() req,
        @Param('stepAssignmentId', ParseIntPipe) stepAssignmentId: number,
        @Body() body: { quantity?: number; notes?: string },
    ) {
        const actorId = this.getActorId(req);
        return this.service.submitMyStepResult(actorId, stepAssignmentId, body);
    }

    // Быстрая складская выдача
    @Post('my/steps/:stepAssignmentId/issue')
    async issueWarehouseStep(
        @Req() req,
        @Param('stepAssignmentId', ParseIntPipe) stepAssignmentId: number,
        @Body() body: { notes?: string },
    ) {
        const actorId = this.getActorId(req);
        return this.service.issueWarehouseStep(actorId, stepAssignmentId, body);
    }

    /* ====== Дополнительно: unread / просмотр документа (если используешь) ====== */

    @Get('my-unread-count')
    async myUnread(@Req() req) {
        const actorId = this.getActorId(req);
        return this.service.countMyUnreadDocuments(actorId);
    }

    @Patch('documents/:id/view')
    async viewDoc(@Req() req, @Param('id', ParseIntPipe) id: number) {
        const actorId = this.getActorId(req);
        return this.service.markDocumentViewed(actorId, id);
    }
}