import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
    constructor(private readonly service: TasksService) { }

    // Список техкарт с поиском
    @Get('tech-cards')
    listTechCards(@Query('search') search?: string) {
        return this.service.listTechCards(search);
    }

    // Детали техкарты (для модалки)
    @Get('tech-cards/:id')
    getTechCard(@Param('id', ParseIntPipe) id: number) {
        return this.service.getTechCardDetails(id);
    }

    // Создать задание + назначения + документы
    @Post()
    createTask(@Body() body: {
        techCardId: number;
        name?: string;
        fields?: { key: string; value: string }[];
        assignments: Array<{ stepId: number; leadUserIds: number[]; memberUserIds: number[] }>;
    }) {
        return this.service.createTaskWithDocuments(body);
    }
}