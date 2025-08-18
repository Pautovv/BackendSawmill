import { Controller, Get, Query } from '@nestjs/common';
import { UnitsService } from './units.service';

@Controller('units')
export class UnitsController {
    constructor(private service: UnitsService) { }

    @Get()
    list(@Query('categoryPath') categoryPath: string) {
        return this.service.listByCategoryPath(categoryPath);
    }

    @Get('available')
    listAvailable(@Query('exclude') exclude?: string) {
        const excludePaths = (exclude ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return this.service.listAvailableByExcludePaths(excludePaths.length ? excludePaths : ['machines', 'tools']);
    }
}