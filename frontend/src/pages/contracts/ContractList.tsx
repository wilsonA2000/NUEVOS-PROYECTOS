import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import contractService from '../../services/contractService';
import { Contract, ContractFilters } from '../../types/contracts';
import ExportButton from '../../components/ExportButton';
import { useAuth } from '../../hooks/useAuth';

const ContractList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ContractFilters>({});
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const { isAuthenticated } = useAuth();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractService.getContracts(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: contractService.deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => contractService.createTermination({ contract: id, reason, termination_date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setTerminateDialogOpen(false);
      setTerminateReason('');
    },
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: number; endDate: string }) => contractService.createRenewal({ contract: id, new_end_date: endDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setRenewDialogOpen(false);
      setNewEndDate('');
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este contrato?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleTerminate = (contract: Contract) => {
    setSelectedContract(contract);
    setTerminateDialogOpen(true);
  };

  const handleRenew = (contract: Contract) => {
    setSelectedContract(contract);
    setRenewDialogOpen(true);
  };

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      case 'terminated':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: Contract['status']) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'expired':
        return 'Expirado';
      case 'terminated':
        return 'Terminado';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  // Asegurar que contracts sea un array
  const contractsArray = Array.isArray(contracts) ? contracts : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Contratos
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ExportButton type="contracts" />
          {isAuthenticated && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/contracts/new')}
            >
              Nuevo Contrato
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.status || ''}
                label="Estado"
                onChange={(e) => setFilters({ ...filters, status: e.target.value as Contract['status'] })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="active">Activo</MenuItem>
                <MenuItem value="expired">Expirado</MenuItem>
                <MenuItem value="terminated">Terminado</MenuItem>
                <MenuItem value="pending">Pendiente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de inicio después de"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de fin antes de"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Propiedad</TableCell>
              <TableCell>Inquilino</TableCell>
              <TableCell>Fecha de Inicio</TableCell>
              <TableCell>Fecha de Fin</TableCell>
              <TableCell>Renta Mensual</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contractsArray.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron contratos
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              contractsArray.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.property?.title || 'N/A'}</TableCell>
                  <TableCell>{contract.tenant?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                  </TableCell>
                  <TableCell>${contract.monthly_rent?.toLocaleString() || '0'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(contract.status)}
                      color={getStatusColor(contract.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(contract.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                    {contract.status === 'active' && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleTerminate(contract)}
                        >
                          <BlockIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRenew(contract)}
                        >
                          <RefreshIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={terminateDialogOpen} onClose={() => setTerminateDialogOpen(false)}>
        <DialogTitle>Terminar Contrato</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Razón de terminación"
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (selectedContract) {
                terminateMutation.mutate({
                  id: selectedContract.id,
                  reason: terminateReason,
                });
              }
            }}
            color="error"
          >
            Terminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)}>
        <DialogTitle>Renovar Contrato</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            label="Nueva fecha de fin"
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (selectedContract) {
                renewMutation.mutate({
                  id: selectedContract.id,
                  endDate: newEndDate,
                });
              }
            }}
            color="primary"
          >
            Renovar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractList; 