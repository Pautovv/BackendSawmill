import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';

export class TechStepFieldDto {
    @IsString()
    @IsNotEmpty()
    key!: string;

    @IsString()
    @IsNotEmpty()
    value!: string;
}

export class TechStepMaterialDto {
    @IsInt()
    @IsPositive()
    materialItemId!: number;

    @IsNumber()
    @IsPositive()
    quantity!: number;

    @IsOptional()
    @IsInt()
    unitId?: number;
}

export class CreateTechStepDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    order?: number;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsInt()
    operationId?: number;

    @IsOptional()
    @IsInt()
    machineItemId?: number;

    @ValidateNested({ each: true })
    @Type(() => TechStepMaterialDto)
    @IsOptional()
    materials?: TechStepMaterialDto[];

    @ValidateNested({ each: true })
    @Type(() => TechStepFieldDto)
    @IsOptional()
    fields?: TechStepFieldDto[];
}