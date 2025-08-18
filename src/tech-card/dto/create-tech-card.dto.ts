import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CreateTechStepDto } from './tech-step.dto';

export class CreateTechCardDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTechStepDto)
    steps!: CreateTechStepDto[];
}