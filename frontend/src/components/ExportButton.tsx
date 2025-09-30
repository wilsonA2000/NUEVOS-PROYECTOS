import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  Code as JsonIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';

// Tipos de exportación disponibles
type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'print';

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  mimeType: string;
  fileExtension: string;
}

interface ExportButtonProps {
  data: any[] | any;
  filename?: string;
  title?: string;
  availableFormats?: ExportFormat[];
  onExport?: (format: ExportFormat, data: any) => Promise<Blob | string> | Blob | string;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  customFormats?: { [key: string]: ExportOption };
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename = 'export',
  title = 'Exportar Datos',
  availableFormats = ['pdf', 'excel', 'csv', 'json'],
  onExport,
  disabled = false,
  variant = 'outlined',
  size = 'medium',
  customFormats = {},
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const defaultExportOptions: { [key in ExportFormat]: ExportOption } = {
    pdf: {
      format: 'pdf',
      label: 'PDF',
      description: 'Documento PDF para impresión',
      icon: <PdfIcon />,
      mimeType: 'application/pdf',
      fileExtension: 'pdf',
    },
    excel: {
      format: 'excel',
      label: 'Excel',
      description: 'Hoja de cálculo Excel',
      icon: <ExcelIcon />,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileExtension: 'xlsx',
    },
    csv: {
      format: 'csv',
      label: 'CSV',
      description: 'Valores separados por comas',
      icon: <CsvIcon />,
      mimeType: 'text/csv',
      fileExtension: 'csv',
    },
    json: {
      format: 'json',
      label: 'JSON',
      description: 'Datos en formato JSON',
      icon: <JsonIcon />,
      mimeType: 'application/json',
      fileExtension: 'json',
    },
    print: {
      format: 'print',
      label: 'Imprimir',
      description: 'Enviar a impresora',
      icon: <PrintIcon />,
      mimeType: '',
      fileExtension: '',
    },
  };

  const exportOptions = { ...defaultExportOptions, ...customFormats };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const downloadFile = (blob: Blob, filename: string, mimeType: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateDefaultExport = (format: ExportFormat, data: any): Blob => {
    switch (format) {
      case 'json':
        const jsonString = JSON.stringify(data, null, 2);
        return new Blob([jsonString], { type: 'application/json' });

      case 'csv':
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(item => 
            Object.values(item).map(value => 
              typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : String(value)
            ).join(',')
          );
          const csvContent = [headers, ...rows].join('\n');
          return new Blob([csvContent], { type: 'text/csv' });
        }
        return new Blob(['No data available'], { type: 'text/csv' });

      case 'excel':
        // Implementación básica para Excel (requeriría librería como xlsx)
        console.warn('Excel export requires additional library (e.g., xlsx)');
        return new Blob(['Excel export not implemented'], { type: 'text/plain' });

      case 'pdf':
        // Implementación básica para PDF (requeriría librería como jsPDF)
        console.warn('PDF export requires additional library (e.g., jsPDF)');
        return new Blob(['PDF export not implemented'], { type: 'text/plain' });

      default:
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!data) {
      setSnackbar({
        open: true,
        message: 'No hay datos para exportar',
        severity: 'error',
      });
      return;
    }

    setIsExporting(true);
    setExportingFormat(format);
    handleMenuClose();

    try {
      let result: Blob | string;

      if (onExport) {
        // Usar función personalizada de exportación
        result = await onExport(format, data);
      } else {
        // Usar generador por defecto
        result = generateDefaultExport(format, data);
      }

      if (format === 'print') {
        // Manejar impresión
        if (typeof result === 'string') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(result);
            printWindow.document.close();
            printWindow.print();
          }
        }
      } else {
        // Descargar archivo
        if (result instanceof Blob) {
          const option = exportOptions[format];
          const finalFilename = `${filename}.${option.fileExtension}`;
          downloadFile(result, finalFilename, option.mimeType);
        }
      }

      setSnackbar({
        open: true,
        message: `Exportación ${format.toUpperCase()} completada`,
        severity: 'success',
      });

    } catch (error) {
      console.error('Error durante la exportación:', error);
      setSnackbar({
        open: true,
        message: `Error al exportar en formato ${format.toUpperCase()}`,
        severity: 'error',
      });
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const filteredOptions = availableFormats.map(format => exportOptions[format]);

  if (filteredOptions.length === 1) {
    // Si solo hay una opción, mostrar botón directo
    const option = filteredOptions[0];
    return (
      <>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          onClick={() => handleExport(option.format)}
          startIcon={
            isExporting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              option.icon
            )
          }
          sx={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
            '&:hover': {
              borderColor: 'var(--color-primary)',
              backgroundColor: variant === 'outlined' ? 'transparent' : undefined,
            },
          }}
        >
          {isExporting ? `Exportando ${option.label}...` : `Exportar ${option.label}`}
        </Button>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
        >
          <Alert severity={snackbar.severity} onClose={handleSnackbarClose}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isExporting}
        onClick={handleMenuOpen}
        endIcon={<ArrowDownIcon />}
        startIcon={
          isExporting ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <DownloadIcon />
          )
        }
        sx={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
          '&:hover': {
            borderColor: 'var(--color-primary)',
            backgroundColor: variant === 'outlined' ? 'transparent' : undefined,
          },
        }}
      >
        {isExporting && exportingFormat 
          ? `Exportando ${exportOptions[exportingFormat].label}...`
          : title
        }
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 280,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-lg)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid var(--color-border)' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Seleccionar Formato
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
            {Array.isArray(data) ? `${data.length} elementos` : 'Datos disponibles'}
          </Typography>
        </Box>

        {/* Export Options */}
        {filteredOptions.map((option, index) => (
          <MenuItem
            key={option.format}
            onClick={() => handleExport(option.format)}
            disabled={isExporting}
            sx={{
              py: 1.5,
              '&:hover': {
                backgroundColor: 'var(--color-background)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'var(--color-primary)' }}>
              {option.icon}
            </ListItemIcon>
            <ListItemText
              primary={option.label}
              secondary={option.description}
              secondaryTypographyProps={{
                sx: { fontSize: '0.75rem', color: 'var(--color-text-secondary)' }
              }}
            />
          </MenuItem>
        ))}

        {/* Advanced Options */}
        <Divider sx={{ my: 1 }} />
        
        <MenuItem
          onClick={() => {
            // Abrir configuración avanzada o compartir
            console.log('Advanced export options');
            handleMenuClose();
          }}
          sx={{
            py: 1,
            '&:hover': {
              backgroundColor: 'var(--color-background)',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'var(--color-text-secondary)' }}>
            <ShareIcon />
          </ListItemIcon>
          <ListItemText
            primary="Opciones avanzadas"
            primaryTypographyProps={{
              sx: { fontSize: '0.875rem', color: 'var(--color-text-secondary)' }
            }}
          />
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExportButton;