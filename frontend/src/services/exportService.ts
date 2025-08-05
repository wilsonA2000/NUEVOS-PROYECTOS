import * as XLSX from 'xlsx';
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

export const exportToExcel = (data: any[], options: ExportOptions): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName);
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
}; 