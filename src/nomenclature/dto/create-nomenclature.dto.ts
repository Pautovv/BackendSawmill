import { NomenclatureType } from '@prisma/client';

export class CreateNomenclatureDto {
    type: NomenclatureType;
    name: string;
    isActive?: boolean;
}