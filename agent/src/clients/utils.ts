import { UUID } from "@ai16z/eliza";

export function castHashToUUID(castHash: string): UUID {
    // Removemos el '0x' del inicio y nos aseguramos de tener suficientes caracteres
    const hash = castHash.replace('0x', '').padEnd(32, '0');
    
    // Formateamos el hash en el formato UUID requerido
    // UUID format: 8-4-4-4-12 caracteres
    return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}` as UUID;
}