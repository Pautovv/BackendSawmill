import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserRoleDto {
    @IsEnum(UserRole)
    role: UserRole;

    @IsOptional()
    @IsInt()
    warehouseId?: number;
}