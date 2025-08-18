import { Module } from '@nestjs/common';
import { TechCardController } from './tech-card.controller';
import { TechCardService } from './tech-card.service';

@Module({
  controllers: [TechCardController],
  providers: [TechCardService]
})
export class TechCardModule {}
