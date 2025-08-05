/**
 * Utilidades para manejar arrays de forma segura
 */

/**
 * Asegura que un valor sea un array, devolviendo un array vacío si no lo es
 */
export const ensureArray = <T>(value: T[] | undefined | null): T[] => {
  return Array.isArray(value) ? value : [];
};

/**
 * Asegura que un valor sea un array y filtra elementos nulos/undefined
 */
export const ensureArrayFiltered = <T>(value: T[] | undefined | null): T[] => {
  return Array.isArray(value) ? value.filter(item => item != null) : [];
};

/**
 * Verifica si un array está vacío de forma segura
 */
export const isEmptyArray = (value: any[] | undefined | null): boolean => {
  return !Array.isArray(value) || value.length === 0;
};

/**
 * Obtiene la longitud de un array de forma segura
 */
export const getArrayLength = (value: any[] | undefined | null): number => {
  return Array.isArray(value) ? value.length : 0;
}; 