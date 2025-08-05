import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Grid,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { paymentService } from '../../services/paymentService';
import { Payment, PaymentFilters } from '../../types/payments';
import ExportButton from '../../components/ExportButton';
import { useAuth } from '../../hooks/useAuth';

const PaymentList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { isAuthenticated } = useAuth();

  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentService.getTransactions(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setDeleteDialogOpen(false);
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (payment: Payment) => paymentService.updateTransaction(payment.id.toString(), { ...payment, status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (payment: Payment) => paymentService.updateTransaction(payment.id.toString(), { ...payment, status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const handleDeleteClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedPayment) {
      deleteMutation.mutate(selectedPayment.id.toString());
    }
  };

  const handleMarkAsPaid = (payment: Payment) => {
    markAsPaidMutation.mutate(payment);
  };

  const handleCancel = (payment: Payment) => {
    cancelMutation.mutate(payment);
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  // Asegurar que payments sea un array
  const paymentsArray = Array.isArray(payments) ? payments : [];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading payments: {error.message}
      </Alert>
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
        <Typography variant="h4">Payments</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ExportButton type="payments" />
          {isAuthenticated && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/payments/new')}
              fullWidth={false}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              New Payment
            </Button>
          )}
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as Payment['status'] })}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Payment Method"
                value={filters.paymentMethod || ''}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="credit_card">Credit Card</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                type="date"
                fullWidth
                label="Start Date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                type="date"
                fullWidth
                label="End Date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Property</TableCell>
              <TableCell>Tenant</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentsArray.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No payments found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paymentsArray.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.contract?.property?.title || 'N/A'}</TableCell>
                  <TableCell>{payment.contract?.tenant?.name || 'N/A'}</TableCell>
                  <TableCell>${payment.amount?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>{payment.due_date ? format(new Date(payment.due_date), 'MMM d, yyyy') : 'N/A'}</TableCell>
                  <TableCell>
                    {payment.payment_date
                      ? format(new Date(payment.payment_date), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      color={getStatusColor(payment.status)}
                      size="small"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    />
                  </TableCell>
                  <TableCell>{payment.payment_method?.replace('_', ' ') || 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small"
                        onClick={() => navigate(`/payments/${payment.id}/edit`)}
                        sx={{ p: { xs: 0.5, sm: 1 } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {payment.status === 'pending' && (
                        <>
                          <IconButton 
                            size="small"
                            onClick={() => handleMarkAsPaid(payment)}
                            sx={{ p: { xs: 0.5, sm: 1 } }}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small"
                            onClick={() => handleCancel(payment)}
                            sx={{ p: { xs: 0.5, sm: 1 } }}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      <IconButton 
                        size="small"
                        onClick={() => handleDeleteClick(payment)}
                        sx={{ p: { xs: 0.5, sm: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Payment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this payment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentList; 