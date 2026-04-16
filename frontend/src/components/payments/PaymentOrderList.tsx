/**
 * PaymentOrderList — tabla unificada de PaymentOrders por rol.
 *
 * Reusa StatusChip del sistema de diseño VIS-2 para los estados.
 * Cada fila muestra: consecutivo (PO-YYYY-NNNNNNNN), tipo, partes,
 * monto + intereses, balance, fecha de vencimiento, status.
 *
 * El botón "Pagar" se habilita cuando la orden está pending/overdue
 * y el usuario actual es el payer. T3.2 implementa el modal de pasarela.
 */
import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Tooltip,
} from '@mui/material';
import { Payment as PayIcon } from '@mui/icons-material';
import StatusChip from '../common/StatusChip';
import type { StageKind } from '../../theme/tokens';

export interface PaymentOrderRow {
  id: string;
  order_number: string;
  order_type: 'rent' | 'service' | 'subscription' | 'deposit' | 'other';
  order_type_display: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  status_display: string;
  payer: string;
  payer_name: string;
  payee: string;
  payee_name: string;
  amount: string;
  interest_amount: string;
  paid_amount: string;
  total_amount: string;
  balance: string;
  date_due: string;
  date_grace_end?: string | null;
  date_max_overdue?: string | null;
  description: string;
}

export interface PaymentOrderListProps {
  orders: PaymentOrderRow[];
  currentUserId: string;
  onPay?: (order: PaymentOrderRow) => void;
  onView?: (order: PaymentOrderRow) => void;
  emptyMessage?: string;
}

const statusToKind = (status: string): StageKind => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'overdue':
      return 'error';
    case 'partial':
      return 'inProgress';
    case 'pending':
      return 'pending';
    default:
      return 'neutral';
  }
};

const formatCOP = (amount: string | number): string => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return '$0';
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const PaymentOrderList: React.FC<PaymentOrderListProps> = ({
  orders, currentUserId, onPay, onView,
  emptyMessage = 'No hay órdenes de pago en esta categoría.',
}) => {
  if (!orders || orders.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Consecutivo</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Pagador</TableCell>
            <TableCell>Beneficiario</TableCell>
            <TableCell align="right">Monto</TableCell>
            <TableCell align="right">Intereses</TableCell>
            <TableCell align="right">Saldo</TableCell>
            <TableCell>Vence</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((o) => {
            const isPayer = o.payer === currentUserId;
            const canPay = isPayer && (o.status === 'pending' || o.status === 'overdue' || o.status === 'partial');
            return (
              <TableRow key={o.id} hover sx={{ cursor: onView ? 'pointer' : 'default' }}>
                <TableCell>
                  <Tooltip title={o.description || ''} placement="top">
                    <Typography
                      variant="body2"
                      onClick={() => onView?.(o)}
                      sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                    >
                      {o.order_number}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{o.order_type_display}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {o.payer_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {o.payee_name}
                  </Typography>
                </TableCell>
                <TableCell align="right">{formatCOP(o.amount)}</TableCell>
                <TableCell align="right" sx={{ color: parseFloat(o.interest_amount) > 0 ? 'error.main' : 'text.secondary' }}>
                  {formatCOP(o.interest_amount)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatCOP(o.balance)}
                </TableCell>
                <TableCell>{formatDate(o.date_due)}</TableCell>
                <TableCell>
                  <StatusChip kind={statusToKind(o.status)} label={o.status_display} />
                </TableCell>
                <TableCell align="right">
                  {canPay && onPay && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PayIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPay(o);
                      }}
                    >
                      Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PaymentOrderList;
