/**
 * PaymentDashboardPage — vista unificada de PaymentOrders por rol.
 *
 * Tabs adaptados al rol del usuario:
 * - tenant:     "Lo que debo" / "Pagado" / "En mora"
 * - landlord:   "Por cobrar" / "Cobrado este mes" / "En mora"
 * - service_provider: "Por cobrar" / "Cobrado" / "Canceladas"
 * - admin:      "Todas" + filtros + export CSV
 *
 * Cards superiores muestran resumen agregado: pendientes, en mora,
 * pagado este mes, monto total pendiente.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/paymentService';
import PaymentOrderList, {
  PaymentOrderRow,
} from '../../components/payments/PaymentOrderList';
import PayOrderModal from '../../components/payments/PayOrderModal';

interface OrdersSummary {
  total: number;
  pending: number;
  overdue: number;
  paid_this_month: number;
  total_amount_pending: number;
}

const formatCOP = (n: number): string => {
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  color = 'primary.main',
}) => (
  <Card variant='outlined'>
    <CardContent>
      <Stack direction='row' spacing={2} alignItems='center'>
        <Box sx={{ color, fontSize: 36, display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography variant='caption' color='text.secondary'>
            {label}
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const PaymentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const userType = user?.user_type;
  const isAdmin = !!user?.is_staff;

  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState<PaymentOrderRow[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payModalOrder, setPayModalOrder] = useState<PaymentOrderRow | null>(
    null,
  );

  // Filtros que dependen de la tab + rol
  const buildFilter = useCallback(
    (tabIdx: number) => {
      if (isAdmin) {
        // Admin: 0=todas, 1=pendientes, 2=mora, 3=pagadas
        switch (tabIdx) {
          case 1:
            return { status: 'pending' as const };
          case 2:
            return { overdue: true };
          case 3:
            return { status: 'paid' as const };
          default:
            return {};
        }
      }
      // Tenant/Landlord/Provider: 0=pendientes, 1=pagadas, 2=mora
      switch (tabIdx) {
        case 0:
          return { status: 'pending' as const };
        case 1:
          return { status: 'paid' as const };
        case 2:
          return { overdue: true };
        default:
          return {};
      }
    },
    [isAdmin],
  );

  const loadOrders = useCallback(
    async (tabIdx: number) => {
      setLoading(true);
      setError(null);
      try {
        const filter = buildFilter(tabIdx);
        const data = await paymentService.getOrders(filter);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];
        setOrders(list);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            'Error cargando órdenes.',
        );
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [buildFilter],
  );

  const loadSummary = useCallback(async () => {
    try {
      const data = await paymentService.getOrdersSummary();
      setSummary(data);
    } catch {
      // Resumen es nice-to-have; no bloquea el dashboard
    }
  }, []);

  useEffect(() => {
    loadOrders(tab);
  }, [tab, loadOrders]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const tabsForRole = (): string[] => {
    if (isAdmin) return ['Todas', 'Pendientes', 'En mora', 'Pagadas'];
    if (userType === 'tenant') return ['Lo que debo', 'Pagado', 'En mora'];
    if (userType === 'landlord') return ['Por cobrar', 'Cobrado', 'En mora'];
    if (userType === 'service_provider')
      return ['Por cobrar', 'Cobrado', 'En mora'];
    return ['Pendientes', 'Pagadas', 'En mora'];
  };

  const labels = tabsForRole();

  const handlePay = (order: PaymentOrderRow) => {
    setPayModalOrder(order);
  };

  const handlePaySuccess = () => {
    // Refrescar el listado y stats; el webhook reconcilia eventualmente.
    loadOrders(tab);
    loadSummary();
  };

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      <Typography variant='h4' sx={{ fontWeight: 700, mb: 1 }}>
        Centro de pagos
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
        Órdenes de pago auditables con consecutivo único. Las cifras se
        actualizan en tiempo real.
      </Typography>

      {/* Stats */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<ReceiptIcon fontSize='inherit' />}
              label='Total órdenes'
              value={summary.total}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<WalletIcon fontSize='inherit' />}
              label='Pendientes'
              value={summary.pending}
              color='warning.main'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<WarningIcon fontSize='inherit' />}
              label='En mora'
              value={summary.overdue}
              color='error.main'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<CheckIcon fontSize='inherit' />}
              label='Pagadas este mes'
              value={summary.paid_this_month}
              color='success.main'
            />
          </Grid>
          {summary.total_amount_pending > 0 && (
            <Grid item xs={12}>
              <Alert severity='info' sx={{ mt: 1 }}>
                Monto total pendiente:{' '}
                <strong>{formatCOP(summary.total_amount_pending)}</strong>
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Tabs por rol */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {labels.map((label, idx) => (
          <Tab key={idx} label={label} />
        ))}
      </Tabs>

      {/* Listado */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity='error'>{error}</Alert>
      ) : (
        <PaymentOrderList
          orders={orders}
          currentUserId={user?.id || ''}
          onPay={handlePay}
        />
      )}

      <PayOrderModal
        open={!!payModalOrder}
        onClose={() => setPayModalOrder(null)}
        order={payModalOrder}
        onSuccess={handlePaySuccess}
      />
    </Container>
  );
};

export default PaymentDashboardPage;
