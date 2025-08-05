import React from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useProperties } from '../hooks/useProperties';
import { useContracts } from '../hooks/useContracts';
import { usePayments } from '../hooks/usePayments';
import { useMessages } from '../hooks/useMessages';
import { exportToExcel, formatDateForExcel, formatCurrencyForExcel } from '../services/exportService';
import { Property } from '../types/properties';
import { Contract } from '../types/contract';
import { Payment } from '../types/payments';
import { Message } from '../types/messages';

interface ExportButtonProps {
  type: 'properties' | 'contracts' | 'payments' | 'messages';
}

const ExportButton: React.FC<ExportButtonProps> = ({ type }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { isAuthenticated } = useAuth();
  const { properties } = useProperties();
  const { contracts } = useContracts();
  const { payments } = usePayments();
  const { messages } = useMessages();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (format: 'excel' | 'csv') => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'properties':
        data = properties?.map((property: Property) => ({
          ID: property.id,
          Título: property.title,
          Dirección: property.address,
          Precio: formatCurrencyForExcel(property.price),
          Habitaciones: property.bedrooms,
          Baños: property.bathrooms,
          Área: `${property.area}m²`,
          Tipo: property.property_type,
          Estado: property.status,
          'Fecha de Creación': formatDateForExcel(property.created_at),
        })) || [];
        filename = 'propiedades';
        break;

      case 'contracts':
        data = contracts?.map((contract: Contract) => ({
          ID: contract.id,
          Propiedad: contract.property.title,
          Inquilino: contract.tenant.name,
          'Fecha de Inicio': formatDateForExcel(contract.start_date),
          'Fecha de Fin': formatDateForExcel(contract.end_date),
          'Renta Mensual': formatCurrencyForExcel(contract.monthly_rent),
          Depósito: formatCurrencyForExcel(contract.deposit_amount),
          Estado: contract.status,
        })) || [];
        filename = 'contratos';
        break;

      case 'payments':
        data = payments?.map((payment: Payment) => ({
          ID: payment.id,
          Propiedad: payment.contract.property.title,
          Inquilino: payment.contract.tenant.name,
          Monto: formatCurrencyForExcel(payment.amount),
          'Fecha de Pago': payment.payment_date ? formatDateForExcel(payment.payment_date) : 'Pendiente',
          'Fecha de Vencimiento': formatDateForExcel(payment.due_date),
          'Método de Pago': payment.payment_method,
          Estado: payment.status,
        })) || [];
        filename = 'pagos';
        break;

      case 'messages':
        data = messages?.map((message: Message) => ({
          ID: message.id,
          Asunto: message.subject,
          Contenido: message.content,
          Remitente: message.sender.name,
          Destinatario: message.recipient.name,
          'Fecha de Envío': formatDateForExcel(message.created_at),
          Estado: message.is_read ? 'Leído' : 'No leído',
        })) || [];
        filename = 'mensajes';
        break;
    }

    exportToExcel(data, {
      filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
      sheetName: filename.charAt(0).toUpperCase() + filename.slice(1),
    });

    handleClose();
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={handleClick}
        size="small"
      >
        Exportar
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exportar a Excel</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportButton; 