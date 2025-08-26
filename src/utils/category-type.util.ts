// Утилита определения "деревянных" категорий на бэке.
// Чтобы логика совпадала с фронтом.
export function isWoodCategoryName(name: string, path: string): boolean {
    const n = (name || '').toLowerCase();
    const p = (path || '').toLowerCase();
    const has = (s: string) => n.includes(s) || p.includes(s);
    if (has('бревн')) return true;
    if (has('пиломатериал')) return true;
    if (has('строган')) return true;
    // любые сочетания влажности с пиломатериалом
    if ((has('влажн')) && (has('пиломатериал'))) return true;
    return false;
}

export function isLogCategory(name: string, path: string): boolean {
    const n = (name || '').toLowerCase();
    const p = (path || '').toLowerCase();
    return n.includes('бревн') || p.includes('бревн');
}

export function isLumberCategory(name: string, path: string): boolean {
    const n = (name || '').toLowerCase();
    const p = (path || '').toLowerCase();
    return n.includes('пиломатериал') || p.includes('пиломатериал') || n.includes('строган') || p.includes('строган');
}