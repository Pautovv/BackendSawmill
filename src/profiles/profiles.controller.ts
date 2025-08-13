import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) {}

    @Get()
    getAll() {
        return this.profilesService.getAll();
    }
    
    @Post()
    create(@Body() body : {name : string, operationIds : number[] }) {
        const { name, operationIds } = body;
        return this.profilesService.create(name, operationIds);
    }

    @Put(':id/operations')
    updateOperation(
        @Param('id', ParseIntPipe) id : number,
        @Body() body: { operationIds : number[] }
    ) {
        return this.profilesService.updateOperation(id, body.operationIds);
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id : number) {
        return this.profilesService.delete(id);
    }
}


