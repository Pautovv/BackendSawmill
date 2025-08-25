import { Controller, Get, Post, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
export class WarehousesController {
    constructor(private service: WarehousesService) { }

    @Get()
    list(@Query('withShelves') withShelves?: string) {
        return this.service.list(withShelves === '1');
    }

    @Post()
    create(@Body() body: { name: string }) {
        return this.service.create(body.name);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.service.remove(id);
    }

    @Get(':id/shelves')
    listShelves(@Param('id', ParseIntPipe) id: number) {
        return this.service.listShelves(id);
    }

    @Post(':id/shelves')
    createShelf(@Param('id', ParseIntPipe) id: number, @Body() body: { name: string }) {
        return this.service.createShelf(id, body.name);
    }

    @Delete('shelves/:shelfId')
    removeShelf(@Param('shelfId', ParseIntPipe) shelfId: number) {
        return this.service.removeShelf(shelfId);
    }
}