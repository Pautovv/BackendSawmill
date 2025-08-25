export class AddTechStepDto {
    name: string;
    operationId?: number;
    machineItemId?: number;
    machineNomenclatureId?: number;
    materials?: {
        nomenclatureId?: number;
        materialItemId?: number;
        quantity?: number; // опционально
        unitId?: number;
    }[];
    fields?: { key: string; value: string }[];
}