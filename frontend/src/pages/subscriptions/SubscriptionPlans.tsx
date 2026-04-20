import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  LinearProgress,
  Stack,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Star as StarIcon,
  WorkspacePremium as PremiumIcon,
  Rocket as RocketIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as UsageIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  max_active_services: number | null;
  max_monthly_requests: number | null;
  featured_listing: boolean;
  priority_in_search: boolean;
  verified_badge: boolean;
  access_to_analytics: boolean;
  direct_messaging: boolean;
  payment_gateway_access: boolean;
  is_recommended: boolean;
}

interface CurrentSubscription {
  id: number;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  start_date: string;
  end_date: string | null;
  active_services_count: number;
  monthly_requests_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPrice(price: number, cycle: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(price);
}

function usagePercent(used: number, max: number | null): number {
  if (!max) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

const planIcon: Record<string, React.ReactNode> = {
  basico: <StarIcon />,
  profesional: <PremiumIcon />,
  enterprise: <BusinessIcon />,
};

const planColor: Record<string, 'default' | 'primary' | 'secondary'> = {
  basico: 'default',
  profesional: 'primary',
  enterprise: 'secondary',
};

const statusColor: Record<string, 'success' | 'error' | 'warning' | 'default'> =
  {
    active: 'success',
    trial: 'warning',
    cancelled: 'error',
    expired: 'default',
  };

const statusLabel: Record<string, string> = {
  active: 'Activa',
  trial: 'Prueba',
  cancelled: 'Cancelada',
  expired: 'Vencida',
};

// ─── Feature Row ──────────────────────────────────────────────────────────────

const FeatureRow: React.FC<{
  label: string;
  value: boolean | number | null;
  isBoolean?: boolean;
}> = ({ label, value, isBoolean = false }) => {
  const active = isBoolean ? Boolean(value) : value !== 0;
  return (
    <ListItem disablePadding sx={{ py: 0.25 }}>
      <ListItemIcon sx={{ minWidth: 32 }}>
        {active ? (
          <CheckIcon fontSize='small' color='success' />
        ) : (
          <CancelIcon fontSize='small' sx={{ color: 'text.disabled' }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography
            variant='body2'
            color={active ? 'text.primary' : 'text.disabled'}
          >
            {isBoolean
              ? label
              : typeof value === 'number'
                ? `${label}: ${value === -1 || value === null ? 'Ilimitado' : value}`
                : label}
          </Typography>
        }
      />
    </ListItem>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Cancel form
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();
  const { ref: plansRef, isVisible: plansVisible } = useScrollReveal({
    threshold: 0.05,
  });

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [plansRes, currentRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/services/subscription-plans/`),
          axios.get(`${API_BASE}/services/subscriptions/current/`, {
            headers: authHeaders(),
          }),
        ]);

        if (plansRes.status === 'fulfilled') {
          const data = Array.isArray(plansRes.value.data)
            ? plansRes.value.data
            : plansRes.value.data.results ?? [];
          setPlans(data);
        }

        if (currentRes.status === 'fulfilled') {
          setCurrent(currentRes.value.data ?? null);
        }
      } catch {
        setError('No se pudieron cargar los planes. Intente de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleSubscribe = async (planId: number) => {
    clearFeedback();
    setActionLoading(planId);
    try {
      await axios.post(
        `${API_BASE}/services/subscriptions/subscribe/`,
        { plan_id: planId },
        { headers: authHeaders() },
      );
      setActionSuccess('Suscripcion activada correctamente.');
      // Refresh current
      const res = await axios.get(
        `${API_BASE}/services/subscriptions/current/`,
        {
          headers: authHeaders(),
        },
      );
      setCurrent(res.data ?? null);
    } catch {
      setActionError(
        'No se pudo activar la suscripcion. Verifique sus datos de pago.',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgrade = async (planId: number) => {
    clearFeedback();
    setActionLoading(planId);
    try {
      await axios.post(
        `${API_BASE}/services/subscriptions/upgrade/`,
        { plan_id: planId },
        { headers: authHeaders() },
      );
      setActionSuccess('Plan actualizado correctamente.');
      const res = await axios.get(
        `${API_BASE}/services/subscriptions/current/`,
        {
          headers: authHeaders(),
        },
      );
      setCurrent(res.data ?? null);
    } catch {
      setActionError('No se pudo actualizar el plan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    clearFeedback();
    setActionLoading(-1);
    try {
      await axios.post(
        `${API_BASE}/services/subscriptions/cancel/`,
        { reason: cancelReason },
        { headers: authHeaders() },
      );
      setActionSuccess(
        'Suscripcion cancelada. Permanecera activa hasta el final del periodo.',
      );
      setCancelReason('');
      setShowCancelForm(false);
      const res = await axios.get(
        `${API_BASE}/services/subscriptions/current/`,
        {
          headers: authHeaders(),
        },
      );
      setCurrent(res.data ?? null);
    } catch {
      setActionError('No se pudo cancelar la suscripcion.');
    } finally {
      setActionLoading(null);
    }
  };

  // Determine button state per plan
  const getPlanAction = (
    plan: SubscriptionPlan,
  ): {
    label: string;
    variant: 'contained' | 'outlined';
    disabled: boolean;
    onClick: () => void;
  } => {
    if (
      !current ||
      current.status === 'expired' ||
      current.status === 'cancelled'
    ) {
      return {
        label: 'Suscribirse',
        variant: 'contained',
        disabled: actionLoading === plan.id,
        onClick: () => handleSubscribe(plan.id),
      };
    }
    if (current.plan.id === plan.id) {
      return {
        label: 'Plan actual',
        variant: 'outlined',
        disabled: true,
        onClick: () => {},
      };
    }
    // Higher price = upgrade
    if (plan.price > current.plan.price) {
      return {
        label: 'Mejorar plan',
        variant: 'contained',
        disabled: actionLoading === plan.id,
        onClick: () => handleUpgrade(plan.id),
      };
    }
    return {
      label: 'Cambiar plan',
      variant: 'outlined',
      disabled: actionLoading === plan.id,
      onClick: () => handleSubscribe(plan.id),
    };
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box
        ref={headerRef}
        sx={{
          textAlign: 'center',
          mb: 5,
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
          }}
        >
          <RocketIcon sx={{ fontSize: 32 }} />
        </Avatar>
        <Typography variant='h3' fontWeight='bold' gutterBottom>
          Planes de Suscripcion
        </Typography>
        <Typography
          variant='h6'
          color='text.secondary'
          sx={{ maxWidth: 540, mx: 'auto' }}
        >
          Elija el plan que mejor se adapte a su volumen de trabajo y objetivos
          de negocio
        </Typography>
      </Box>

      {/* Feedback */}
      {error && (
        <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {actionError && (
        <Alert severity='error' sx={{ mb: 3 }} onClose={clearFeedback}>
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert severity='success' sx={{ mb: 3 }} onClose={clearFeedback}>
          {actionSuccess}
        </Alert>
      )}

      {/* Current Subscription Card */}
      {current &&
        (current.status === 'active' || current.status === 'trial') && (
          <Paper
            elevation={0}
            variant='outlined'
            sx={{
              p: 3,
              mb: 4,
              borderColor: 'primary.main',
              borderRadius: 2,
              borderWidth: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 2,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant='h5' fontWeight='bold'>
                  Suscripcion Actual
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                  alignItems='center'
                  sx={{ mt: 0.5 }}
                >
                  <Typography variant='h6' color='primary.main'>
                    {current.plan.name}
                  </Typography>
                  <Chip
                    label={statusLabel[current.status]}
                    color={statusColor[current.status]}
                    size='small'
                  />
                </Stack>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <CalendarIcon fontSize='small' />
                  Desde: {formatDate(current.start_date)}
                </Typography>
                {current.end_date && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.25,
                    }}
                  >
                    <CalendarIcon fontSize='small' />
                    Hasta: {formatDate(current.end_date)}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <UsageIcon fontSize='small' color='action' />
                  <Typography variant='body2' fontWeight='medium'>
                    Servicios publicados
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant='body2' color='text.secondary'>
                    {current.active_services_count} /{' '}
                    {current.plan.max_active_services ?? 'Ilimitado'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {usagePercent(
                      current.active_services_count,
                      current.plan.max_active_services,
                    )}
                    %
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={usagePercent(
                    current.active_services_count,
                    current.plan.max_active_services,
                  )}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={
                    usagePercent(
                      current.active_services_count,
                      current.plan.max_active_services,
                    ) >= 90
                      ? 'error'
                      : 'primary'
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <UsageIcon fontSize='small' color='action' />
                  <Typography variant='body2' fontWeight='medium'>
                    Solicitudes del mes
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant='body2' color='text.secondary'>
                    {current.monthly_requests_count} /{' '}
                    {current.plan.max_monthly_requests ?? 'Ilimitado'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {usagePercent(
                      current.monthly_requests_count,
                      current.plan.max_monthly_requests,
                    )}
                    %
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={usagePercent(
                    current.monthly_requests_count,
                    current.plan.max_monthly_requests,
                  )}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={
                    usagePercent(
                      current.monthly_requests_count,
                      current.plan.max_monthly_requests,
                    ) >= 90
                      ? 'error'
                      : 'primary'
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        )}

      {/* Plans Grid */}
      <Box
        ref={plansRef}
        sx={{
          opacity: plansVisible ? 1 : 0,
          transform: plansVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s',
        }}
      >
        <Grid container spacing={3} alignItems='stretch'>
          {plans.map((plan, idx) => {
            const action = getPlanAction(plan);
            const isCurrentPlan = current?.plan.id === plan.id;
            const slug = plan.slug?.toLowerCase() || '';

            return (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card
                  elevation={plan.is_recommended ? 6 : 1}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: plan.is_recommended ? 2 : 1,
                    borderColor: plan.is_recommended
                      ? 'primary.main'
                      : 'divider',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: plan.is_recommended ? 8 : 4,
                    },
                    opacity: plansVisible ? 1 : 0,
                    transform: plansVisible
                      ? 'translateY(0)'
                      : 'translateY(16px)',
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                >
                  {/* Recommended badge */}
                  {plan.is_recommended && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -1,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 2,
                        py: 0.25,
                        borderBottomLeftRadius: 8,
                        borderBottomRightRadius: 8,
                        zIndex: 1,
                      }}
                    >
                      <Typography variant='caption' fontWeight='bold'>
                        Recomendado
                      </Typography>
                    </Box>
                  )}

                  <CardContent
                    sx={{ flex: 1, pt: plan.is_recommended ? 3.5 : 2 }}
                  >
                    {/* Plan header */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: plan.is_recommended
                            ? 'primary.main'
                            : 'action.hover',
                          color: plan.is_recommended
                            ? 'primary.contrastText'
                            : 'text.secondary',
                          width: 44,
                          height: 44,
                        }}
                      >
                        {planIcon[slug] ?? <StarIcon />}
                      </Avatar>
                      <Box>
                        <Typography variant='h6' fontWeight='bold'>
                          {plan.name}
                        </Typography>
                        {isCurrentPlan && (
                          <Chip
                            label='Plan actual'
                            color='success'
                            size='small'
                            sx={{ height: 18, fontSize: 10 }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Price */}
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant='h4'
                        fontWeight='bold'
                        color='primary.main'
                        component='span'
                      >
                        {formatPrice(plan.price, plan.billing_cycle)}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        component='span'
                        sx={{ ml: 0.5 }}
                      >
                        / {plan.billing_cycle === 'yearly' ? 'ano' : 'mes'}
                      </Typography>
                    </Box>

                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 2, minHeight: 40 }}
                    >
                      {plan.description}
                    </Typography>

                    <Divider sx={{ mb: 1.5 }} />

                    {/* Feature list */}
                    <List dense disablePadding>
                      <FeatureRow
                        label={`Servicios activos: ${plan.max_active_services ?? 'Ilimitado'}`}
                        value={plan.max_active_services !== 0}
                      />
                      <FeatureRow
                        label={`Solicitudes/mes: ${plan.max_monthly_requests ?? 'Ilimitado'}`}
                        value={plan.max_monthly_requests !== 0}
                      />
                      <FeatureRow
                        label='Listado destacado'
                        value={plan.featured_listing}
                        isBoolean
                      />
                      <FeatureRow
                        label='Prioridad en busqueda'
                        value={plan.priority_in_search}
                        isBoolean
                      />
                      <FeatureRow
                        label='Insignia verificado'
                        value={plan.verified_badge}
                        isBoolean
                      />
                      <FeatureRow
                        label='Acceso a analiticas'
                        value={plan.access_to_analytics}
                        isBoolean
                      />
                      <FeatureRow
                        label='Mensajeria directa'
                        value={plan.direct_messaging}
                        isBoolean
                      />
                      <FeatureRow
                        label='Pasarela de pagos'
                        value={plan.payment_gateway_access}
                        isBoolean
                      />
                    </List>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={action.variant}
                      color='primary'
                      size='large'
                      disabled={action.disabled}
                      onClick={action.onClick}
                      startIcon={
                        actionLoading === plan.id ? (
                          <CircularProgress size={18} color='inherit' />
                        ) : null
                      }
                      sx={{ borderRadius: 1.5, py: 1.25 }}
                    >
                      {action.label}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}

          {plans.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ textAlign: 'center', py: 6, px: 2 }}>
                <WarningIcon
                  sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}
                />
                <Typography variant='h6' color='text.secondary'>
                  No hay planes disponibles en este momento
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 0.5 }}
                >
                  Contacte a soporte para obtener mas informacion
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Cancel Subscription */}
      {current && current.status === 'active' && (
        <Box sx={{ mt: 5 }}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant='h6' fontWeight='bold' gutterBottom>
            Cancelar suscripcion
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2, maxWidth: 560 }}
          >
            Al cancelar, su plan permanecera activo hasta el final del periodo
            de facturacion vigente. Despues de esa fecha no se realizaran cargos
            adicionales.
          </Typography>

          {!showCancelForm ? (
            <Button
              variant='outlined'
              color='error'
              startIcon={<CancelIcon />}
              onClick={() => setShowCancelForm(true)}
            >
              Cancelar suscripcion
            </Button>
          ) : (
            <Paper
              variant='outlined'
              sx={{ p: 3, maxWidth: 560, borderColor: 'error.light' }}
            >
              <Typography variant='subtitle2' gutterBottom>
                Cuentenos por que desea cancelar
              </Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                placeholder='Indique el motivo de la cancelacion...'
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                size='small'
                sx={{ mb: 2 }}
              />
              <Stack direction='row' spacing={1}>
                <Button
                  variant='contained'
                  color='error'
                  onClick={handleCancel}
                  disabled={actionLoading === -1 || !cancelReason.trim()}
                  startIcon={
                    actionLoading === -1 ? (
                      <CircularProgress size={16} color='inherit' />
                    ) : (
                      <CancelIcon />
                    )
                  }
                >
                  Confirmar cancelacion
                </Button>
                <Button
                  variant='outlined'
                  color='inherit'
                  onClick={() => {
                    setShowCancelForm(false);
                    setCancelReason('');
                  }}
                >
                  Volver
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SubscriptionPlans;
