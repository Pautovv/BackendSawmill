export class CreateTechCardDto {
    name: string;
    itemId?: number;
    steps?: {
        name: string;
        machineNomenclatureId?: number;
        machineItemId?: number;
        operationId?: number;
        materials?: {
            nomenclatureId?: number;   // MATERIAL
            materialItemId?: number;   // старый путь (если нужен)
            // quantity убран с фронта – если не передан, сервис подставит 1
            quantity?: number;
            unitId?: number;
        }[];
        fields?: { key: string; value: string }[];
    }[];
}