import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Put } from '@nestjs/common';
import { OperationService } from './operations.service';

@Controller('operations')
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  @Get()
  getAll() {
    return this.operationService.getAll();
  }

  @Post()
  create(@Body() body: { name: string; machineIds: number[] }) {
    const { name, machineIds } = body;
    return this.operationService.create(name, machineIds);
  }

  @Put(':id/machines')
  updateMachines(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { machineIds: number[] }
  ) {
    return this.operationService.updateMachines(id, body.machineIds);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.operationService.delete(id);
  }
}
