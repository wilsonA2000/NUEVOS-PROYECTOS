/**
 * PayOrderModal — modal para iniciar el pago de una PaymentOrder.
 *
 * T3.2 · Tabs por pasarela disponible:
 * - Stripe: tarjeta de crédito/débito (componente StripePaymentForm existente)
 * - Wompi/PSE: redirect al banco vía Wompi
 * - Wompi/Nequi: pago push a celular
 *
 * Cuando el usuario confirma, se crea la transacción en backend; el
 * webhook posterior reconcilia automáticamente la PaymentOrder (T2.3).
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  CreditCard as CardIcon,
  AccountBalance as PSEIcon,
  PhoneAndroid as NequiIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';
import type { PaymentOrderRow } from './PaymentOrderList';

export interface PayOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: PaymentOrderRow | null;
  onSuccess?: (gatewayResponse: any) => void;
}

const formatCOP = (amount: string | number): string => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return '$0';
  return n.toLocaleString('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
};

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

const TabPanel: React.FC<TabPanelProps> = ({ value, index, children }) => (
  <Box hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

const PayOrderModal: React.FC<PayOrderModalProps> = ({ open, onClose, order, onSuccess }) => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PSE form state
  const [bankCode, setBankCode] = useState('');
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');

  // Nequi state
  const [nequiPhone, setNequiPhone] = useState('');

  if (!order) return null;

  const handlePSE = async () => {
    if (!bankCode || !documentNumber) {
      setError('Selecciona un banco y completa tu número de documento.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/payments/wompi/initiate/', {
        amount: parseFloat(order.balance),
        payment_method: 'PSE',
        description: `Orden ${order.order_number}`,
        bank_code: bankCode,
        document_type: documentType,
        document_number: documentNumber,
        redirect_url: `${window.location.origin}/app/payments?pay_status=success`,
      });
      onSuccess?.(response.data);
      // Wompi suele devolver una URL de redirección al banco
      const redirectUrl = response.data?.metadata?.async_payment_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Error iniciando pago PSE.');
    } finally {
      setLoading(false);
    }
  };

  const handleNequi = async () => {
    if (!nequiPhone) {
      setError('Ingresa tu número Nequi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/payments/wompi/initiate/', {
        amount: parseFloat(order.balance),
        payment_method: 'NEQUI',
        description: `Orden ${order.order_number}`,
        phone_number: nequiPhone,
      });
      onSuccess?.(response.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Error iniciando pago Nequi.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripe = async () => {
    setError('El flujo de Stripe (tarjeta) requiere el componente StripePaymentForm con Elements; integración pendiente.');
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Pagar orden {order.order_number}
        <Typography variant="body2" color="text.secondary">
          {order.order_type_display} · {formatCOP(order.balance)} a {order.payee_name}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<PSEIcon />} label="PSE" />
          <Tab icon={<NequiIcon />} label="Nequi" />
          <Tab icon={<CardIcon />} label="Tarjeta" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Pago directo desde tu banco vía PSE. Serás redirigido al portal del banco
              para autenticarte.
            </Typography>
            <TextField
              select fullWidth label="Banco"
              value={bankCode} onChange={(e) => setBankCode(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="1007">BANCOLOMBIA</MenuItem>
              <MenuItem value="1019">SCOTIABANK COLPATRIA</MenuItem>
              <MenuItem value="1051">DAVIVIENDA</MenuItem>
              <MenuItem value="1001">BANCO DE BOGOTÁ</MenuItem>
              <MenuItem value="1023">BANCO DE OCCIDENTE</MenuItem>
              <MenuItem value="1013">BBVA COLOMBIA</MenuItem>
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                select label="Tipo doc." value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={loading} sx={{ minWidth: 140 }}
              >
                <MenuItem value="CC">Cédula</MenuItem>
                <MenuItem value="CE">Cédula extranjería</MenuItem>
                <MenuItem value="NIT">NIT</MenuItem>
                <MenuItem value="PP">Pasaporte</MenuItem>
              </TextField>
              <TextField
                fullWidth label="Número de documento"
                value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)}
                disabled={loading}
              />
            </Stack>
            <Button
              variant="contained" size="large" onClick={handlePSE}
              disabled={loading || !bankCode || !documentNumber}
              startIcon={loading ? <CircularProgress size={20} /> : <PSEIcon />}
            >
              {loading ? 'Iniciando...' : `Pagar ${formatCOP(order.balance)} con PSE`}
            </Button>
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Recibirás una notificación push en tu app Nequi para autorizar el pago.
            </Typography>
            <TextField
              fullWidth label="Número celular Nequi" placeholder="3001234567"
              value={nequiPhone} onChange={(e) => setNequiPhone(e.target.value)}
              disabled={loading}
              type="tel"
            />
            <Button
              variant="contained" size="large" onClick={handleNequi}
              disabled={loading || !nequiPhone}
              startIcon={loading ? <CircularProgress size={20} /> : <NequiIcon />}
            >
              {loading ? 'Enviando...' : `Pagar ${formatCOP(order.balance)} con Nequi`}
            </Button>
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Stack spacing={2}>
            <Alert severity="info">
              El flujo con tarjeta usa Stripe Elements y requiere el componente
              StripePaymentForm. Integración pendiente en T3.2.b.
            </Alert>
            <Button variant="outlined" onClick={handleStripe} disabled>
              Pagar con tarjeta (próximamente)
            </Button>
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayOrderModal;
