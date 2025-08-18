import { Module } from '@nestjs/common';
import { ItemController } from './items.controller';
import { ItemService } from './items.service';

@Module({
  controllers: [ItemController],
  providers: [ItemService]
})
export class ItemsModule {}
