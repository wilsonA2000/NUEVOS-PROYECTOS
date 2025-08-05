import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { usePayments } from '../../hooks/usePayments';

export const PaymentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { payments, isLoading, error } = usePayments();

  const payment = payments?.find((p) => p.id === id);

  if (isLoading) {
    return <Typography>Cargando...</Typography>;
  }

  if (error || !payment) {
    return <Typography color="error">Error al cargar el pago</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h5" component="div">
            Pago #{payment.id}
          </Typography>
          <Chip
            label={payment.status}
            color={
              payment.status === 'paid'
                ? 'success'
                : payment.status === 'overdue'
                ? 'error'
                : 'warning'
            }
          />
        </Box>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={4}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Contrato"
                  secondary={payment.contractId}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AttachMoneyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Monto"
                  secondary={`$${payment.amount.toLocaleString()}`}
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CalendarIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Fecha de Vencimiento"
                  secondary={new Date(payment.dueDate).toLocaleDateString()}
                />
              </ListItem>
              {payment.paymentDate && (
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Fecha de Pago"
                    secondary={new Date(payment.paymentDate).toLocaleDateString()}
                  />
                </ListItem>
              )}
            </List>
          </Grid>
          {payment.status === 'paid' && (
            <Grid item xs={12} sm={6} md={4}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <PaymentIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Método de Pago"
                    secondary={
                      payment.paymentMethod === 'cash'
                        ? 'Efectivo'
                        : payment.paymentMethod === 'bank_transfer'
                        ? 'Transferencia Bancaria'
                        : 'Tarjeta de Crédito'
                    }
                  />
                </ListItem>
                {payment.reference && (
                  <ListItem>
                    <ListItemIcon>
                      <ReceiptIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Referencia"
                      secondary={payment.reference}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          )}
        </Grid>

        {payment.notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Notas
            </Typography>
            <Typography variant="body1" paragraph>
              {payment.notes}
            </Typography>
          </>
        )}

        <Box display="flex" gap={2} mt={3}>
          <Button
            variant="outlined"
            onClick={() => navigate('/app/payments')}
          >
            Volver
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/app/payments/${payment.id}/edit`)}
          >
            Editar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}; 