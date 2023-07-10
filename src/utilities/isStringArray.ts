export function isStringArray(array: any[]): array is string[] {
    return array.every(item => typeof item === 'string');
}
