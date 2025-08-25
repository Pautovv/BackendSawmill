import { Controller, Get, Query, Post, Body, ParseIntPipe } from '@nestjs/common';
import { NomenclatureService } from './nomenclature.service';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';
import { NomenclatureType } from '@prisma/client';

@Controller('passport-nomenclature')
export class NomenclatureController {
    constructor(private service: NomenclatureService) { }

    @Get()
    find(
        @Query('type') type: NomenclatureType,
        @Query('search') search?: string,
        @Query('limit') limit = '20',
    ) {
        return this.service.search(type, search, Number(limit));
    }

    @Post()
    create(@Body() dto: CreateNomenclatureDto) {
        return this.service.create(dto);
    }
}