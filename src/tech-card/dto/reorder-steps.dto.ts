import { IsArray, IsInt, IsPositive } from 'class-validator';

export class ReorderStepsDto {
    @IsArray()
    stepIds!: number[];

    @IsInt()
    @IsPositive()
    techCardId!: number;
}