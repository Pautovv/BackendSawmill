import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddStepMaterialDto {
    @IsOptional()
    @IsInt()
    itemId?: number;

    @IsOptional()
    @IsInt()
    nomenclatureId?: number;

    @IsOptional()
    @IsInt()
    unitId?: number; // если unit окончательно не используешь — удали из модели и отсюда
}

class AddStepFieldDto {
    @IsString()
    key: string;

    @IsString()
    value: string;
}

export class AddTechStepDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsInt()
    machineItemId?: number;

    @IsOptional()
    @IsInt()
    machineNomenclatureId?: number;

    @IsOptional()
    @IsInt()
    operationId?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AddStepMaterialDto)
    materials: AddStepMaterialDto[] = [];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AddStepFieldDto)
    fields: AddStepFieldDto[] = [];
}