import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { TechCardService } from './tech-card.service';
import { CreateTechCardDto } from './dto/create-tech-card.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Controller()
export class TechCardController {
    constructor(private service: TechCardService) { }

    @Post('tech-cards')
    create(@Body() dto: CreateTechCardDto) {
        return this.service.create(dto);
    }

    @Get('tech-cards')
    findAll() {
        return this.service.findAll();
    }

    @Get('tech-cards/:id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Post('tech-cards/:id/steps')
    addStep(
        @Param('id', ParseIntPipe) id: number,
        @Body()
        body: {
            name: string;
            operationId?: number;
            machineItemId?: number;
            materials?: { materialItemId: number; quantity: number; unitId?: number }[];
            fields?: { key: string; value: string }[];
        },
    ) {
        return this.service.addStep(id, body);
    }

    @Post('tech-cards/:id/steps/reorder')
    reorder(@Param('id', ParseIntPipe) id: number, @Body() body: { stepIds: number[] }) {
        const dto: ReorderStepsDto = { techCardId: id, stepIds: body.stepIds };
        return this.service.reorderSteps(dto);
    }
}