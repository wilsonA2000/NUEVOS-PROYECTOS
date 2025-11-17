import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExportOptions {
  filename: string;
  sheetName: string;
}

export const formatDateForExcel = (date: string): string => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
};

export const formatCurrencyForExcel = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

/**
 * Exporta datos a Excel usando lazy loading de la librería XLSX.
 * La librería (~800 KB) solo se carga cuando se llama esta función.
 */
export const exportToExcel = async (data: any[], options: ExportOptions): Promise<void> => {
  // Lazy load XLSX solo cuando se necesita exportar
  const XLSX = await import('xlsx');

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName);
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
}; 