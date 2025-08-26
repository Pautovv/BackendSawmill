import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddTechStepDto } from './add-step.dto';

export class CreateTechCardDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsInt()
    itemId?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AddTechStepDto)
    steps: AddTechStepDto[];
}