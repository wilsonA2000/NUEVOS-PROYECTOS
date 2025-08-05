import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { paymentService } from '../../services/paymentService';
import { PaymentFormData } from '../../types/payments';
import { useAuth } from '../../hooks/useAuth';

const PaymentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isEditMode = Boolean(id);

const [formData, setFormData] = useState<PaymentFormData>({
    contract_id: 0,
    amount: 0,
    payment_date: '',
    due_date: '',
    payment_method: 'bank_transfer',
    status: 'pending',
  });

  const { data: payment, isLoading: loadingPayment } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentService.getTransaction(id!),
    enabled: isEditMode && !!id,
  });

  useEffect(() => {
    if (payment) {

setFormData({
        contract_id: payment.contract.id,
        amount: payment.amount,
        payment_date: payment.payment_date || '',
        due_date: payment.due_date,
        payment_method: payment.payment_method,
        status: payment.status,
      });
    }
  }, [payment]);

  const createMutation = useMutation({
    mutationFn: (data: PaymentFormData) => {
      // Convertir PaymentFormData al formato esperado por el servicio
      const paymentData = {
        contract: { id: data.contract_id },
        amount: data.amount,
        payment_date: data.payment_date,
        due_date: data.due_date,
        payment_method: data.payment_method,
        status: data.status,
      };
      return paymentService.createTransaction(paymentData);
    },
    onSuccess: (data) => {

queryClient.invalidateQueries({ queryKey: ['payments'] });
      navigate('/app/payments');
    },
    onError: (error) => {
      console.error('❌ PaymentForm: Error creando pago:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PaymentFormData) => {
      // Convertir PaymentFormData al formato esperado por el servicio
      const paymentData = {
        contract: { id: data.contract_id },
        amount: data.amount,
        payment_date: data.payment_date,
        due_date: data.due_date,
        payment_method: data.payment_method,
        status: data.status,
      };
      return paymentService.updateTransaction(id!, paymentData);
    },
    onSuccess: (data) => {

queryClient.invalidateQueries({ queryKey: ['payments'] });
      navigate('/app/payments');
    },
    onError: (error) => {
      console.error('❌ PaymentForm: Error actualizando pago:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? Number(value) : value,
    }));
  };

  const handleBack = () => {

navigate('/app/payments');
  };

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated && !authLoading) {

return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Necesitas iniciar sesión para crear pagos
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          Iniciar Sesión
        </Button>
      </Box>
    );
  }

  // Si está cargando la autenticación
  if (authLoading) {

return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verificando autenticación...</Typography>
      </Box>
    );
  }

  // Si está cargando el pago (solo en modo edición)
  if (isEditMode && loadingPayment) {

return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando pago...</Typography>
      </Box>
    );
  }

return (
    <Box>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }} 
        gap={{ xs: 2, sm: 0 }}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            {id ? 'Editar Pago' : 'Nuevo Pago'}
          </Typography>
        </Box>
      </Box>

      {/* Mostrar errores de mutación */}
      {(createMutation.error || updateMutation.error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {createMutation.error?.message || updateMutation.error?.message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="ID del Contrato"
                  value={formData.contract_id}
                  onChange={(e) => setFormData({ ...formData, contract_id: Number(e.target.value) })}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Monto"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  required
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Método de Pago"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  required
                  size="small"
                >
                  <MenuItem value="bank_transfer">Transferencia Bancaria</MenuItem>
                  <MenuItem value="credit_card">Tarjeta de Crédito</MenuItem>
                  <MenuItem value="cash">Efectivo</MenuItem>
                  <MenuItem value="other">Otro</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Estado"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  size="small"
                >
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="paid">Pagado</MenuItem>
                  <MenuItem value="overdue">Vencido</MenuItem>
                  <MenuItem value="cancelled">Cancelado</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha de Pago"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha de Vencimiento"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    startIcon={
                      createMutation.isPending || updateMutation.isPending ? (
                        <CircularProgress size={20} />
                      ) : null
                    }
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Guardando...'
                      : isEditMode
                      ? 'Actualizar Pago'
                      : 'Crear Pago'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentForm; 