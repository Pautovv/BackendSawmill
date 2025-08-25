import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('tasks')
export class TasksController {
    constructor(private readonly service: TasksService) { }

    // Список техкарт
    @Get('tech-cards')
    listTechCards(@Query('search') search?: string) {
        return this.service.listTechCards(search);
    }

    // Детали техкарты
    @Get('tech-cards/:id')
    getTechCard(@Param('id', ParseIntPipe) id: number) {
        return this.service.getTechCardDetails(id);
    }

    // Новый эндпоинт — список пользователей для назначения
    @UseGuards(JwtAuthGuard)
    @Get('assignable-users')
    listAssignableUsers(@Req() req: any, @Query('q') q?: string) {
        // req.user (JwtStrategy должен класть userId / role)
        return this.service.listAssignableUsers(q);
    }

    // Создать задание
    @UseGuards(JwtAuthGuard)
    @Post()
    createTask(
        @Body() body: {
            techCardId: number;
            name?: string;
            fields?: { key: string; value: string }[];
            assignments: Array<{ stepId: number; leadUserIds: number[]; memberUserIds: number[] }>;
            preGeneratePdfs?: boolean;
        },
    ) {
        return this.service.createTaskWithDocuments(body);
    }
}