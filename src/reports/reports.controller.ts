import { Controller, Get, Query, Param, ParseIntPipe, Post, Body } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TaskStatus } from '@prisma/client';

@Controller('reports')
export class ReportsController {
    constructor(private service: ReportsService) { }

    @Get('tasks')
    async listTasks(
        @Query('search') search?: string,
        @Query('status') status?: TaskStatus | 'ALL',
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('techCardId') techCardId?: string,
        @Query('itemId') itemId?: string,
        @Query('page') page?: string,
        @Query('perPage') perPage?: string,
    ) {
        return this.service.listTasks({
            search,
            status: (status as any) || 'ALL',
            from,
            to,
            techCardId: techCardId ? Number(techCardId) : undefined,
            itemId: itemId ? Number(itemId) : undefined,
            page: page ? Number(page) : 1,
            perPage: perPage ? Number(perPage) : 20,
        });
    }

    @Get('tasks/:taskId')
    async getTaskDetails(@Param('taskId', ParseIntPipe) taskId: number) {
        return this.service.getTaskDetails(taskId);
    }

    @Post('tasks/:taskId')
    async saveTaskReport(
        @Param('taskId', ParseIntPipe) taskId: number,
        @Body()
        body: {
            status?: TaskStatus;
            total?: { quantity?: number | null; unit?: string | null; notes?: string | null };
            results: Array<{ stepAssignmentId: number; quantity?: number | null; unit?: string | null; notes?: string | null }>;
        },
    ) {
        return this.service.saveTaskReport(taskId, body);
    }
}