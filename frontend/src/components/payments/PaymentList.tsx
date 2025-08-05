import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { MoreVert as MoreVertIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { usePayments } from '../../hooks/usePayments';
import { useAuth } from '../../hooks/useAuth';

export const PaymentList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { transactions, balance, isLoading, error, deleteTransaction } = usePayments();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = React.useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleView = () => {
    if (selectedTransaction) {
      navigate(`/app/payments/${selectedTransaction.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedTransaction) {
      try {
        await deleteTransaction(selectedTransaction.id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
    handleMenuClose();
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Alert severity="warning">
        Debes iniciar sesión para ver los pagos.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error al cargar los pagos: {error.message}
      </Alert>
    );
  }

  // Asegurar que transactions sea un array
  const transactionsArray = Array.isArray(transactions) ? transactions : [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Pagos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/payments/new')}
        >
          Nuevo Pago
        </Button>
      </Box>

      {balance && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6">
              Balance Actual: ${balance.current || 0}
            </Typography>
            <Typography variant="body2">
              Pagos pendientes: ${balance.pending || 0}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {transactionsArray.map((transaction) => (
          <Grid item xs={12} sm={6} md={4} key={transaction.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" component="div">
                    ${transaction.amount || 0}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, transaction)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {transaction.description || 'Sin descripción'}
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Chip
                    label={transaction.status || 'Sin estado'}
                    color={
                      transaction.status === 'completed' ? 'success' :
                      transaction.status === 'pending' ? 'warning' :
                      transaction.status === 'failed' ? 'error' : 'default'
                    }
                    size="small"
                  />
                </Box>
                <Typography variant="body2">
                  <strong>Tipo:</strong> {transaction.type || 'No especificado'}
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha:</strong> {transaction.created_at || 'No especificada'}
                </Typography>
                <Typography variant="body2">
                  <strong>Método:</strong> {transaction.payment_method || 'No especificado'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {transactionsArray.length === 0 && (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" color="text.secondary">
            No hay transacciones disponibles
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Realiza tu primer pago haciendo clic en "Nuevo Pago"
          </Typography>
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>Ver Detalles</MenuItem>
        <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
      </Menu>
    </Box>
  );
};