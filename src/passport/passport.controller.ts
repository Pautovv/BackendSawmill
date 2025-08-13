import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PassportService } from './passport.service';

@Controller('passports')
export class PassportController {
  constructor(private readonly passportService: PassportService) {}

  @Get()
  getAll() {
    return this.passportService.getAll();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.passportService.getOne(id);
  }

  @Post()
  create(@Body() body: {
    productName: string;
    steps: Array<{
      machineId?: number;
      operationId?: number;
      profileId?: number;
      rawMaterialId?: number;
      repeats?: number;
    }>;
  }) {
    return this.passportService.createPassport(body);
  }
}
