import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Autocomplete,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { contractService } from '../../services/contractService';
import { ContractFormData } from '../../types/contracts';
import { useAuth } from '../../hooks/useAuth';
import { propertyService } from '../../services/propertyService';
import { Property } from '../../types/property';

// Using Property type from services

const ContractForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isEditing = Boolean(id);

const [formData, setFormData] = useState<ContractFormData>({
    property_id: 0,
    tenant_id: 0,
    start_date: '',
    end_date: '',
    monthly_rent: 0,
    deposit_amount: 0,
    status: 'active',
  });

  const { data: contract, isLoading: loadingContract } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractService.getContract(id!),
    enabled: isEditing && !!id,
  });

  // Fetch properties for the form
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: propertyService.getProperties,
  });

  useEffect(() => {
    if (contract) {

setFormData({
        property_id: contract.property.id,
        tenant_id: contract.tenant.id,
        start_date: contract.start_date,
        end_date: contract.end_date,
        monthly_rent: contract.monthly_rent,
        deposit_amount: contract.deposit_amount,
        status: contract.status,
      });
    }
  }, [contract]);

  const createMutation = useMutation({
    mutationFn: (data: ContractFormData) => {
      // Convertir ContractFormData al formato esperado por el servicio
      const contractData = {
        property: { id: data.property_id },
        tenant: { id: data.tenant_id },
        start_date: data.start_date,
        end_date: data.end_date,
        monthly_rent: data.monthly_rent,
        deposit_amount: data.deposit_amount,
        status: data.status,
      };
      return contractService.createContract(contractData);
    },
    onSuccess: (data) => {

navigate('/app/contracts');
    },
    onError: (error) => {
      console.error('❌ ContractForm: Error creando contrato:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ContractFormData }) => {
      // Convertir ContractFormData al formato esperado por el servicio
      const contractData = {
        property: { id: data.property_id },
        tenant: { id: data.tenant_id },
        start_date: data.start_date,
        end_date: data.end_date,
        monthly_rent: data.monthly_rent,
        deposit_amount: data.deposit_amount,
        status: data.status,
      };
      return contractService.updateContract(id.toString(), contractData);
    },
    onSuccess: (data) => {

navigate('/app/contracts');
    },
    onError: (error) => {
      console.error('❌ ContractForm: Error actualizando contrato:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

if (isEditing && id) {
      updateMutation.mutate({ id: Number(id), data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleBack = () => {

navigate('/app/contracts');
  };

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated && !authLoading) {

return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Necesitas iniciar sesión para crear contratos
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

  // Si está cargando el contrato (solo en modo edición)
  if (isEditing && loadingContract) {

return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando contrato...</Typography>
      </Box>
    );
  }

// Show loading state while data is being fetched
  if (loadingProperties) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">
          {isEditing ? 'Editar Contrato' : 'Nuevo Contrato'}
        </Typography>
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
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  options={properties}
                  getOptionLabel={(option) => `${option.title} - ${option.address}`}
                  value={properties.find((p) => p.id === formData.property_id.toString()) || null}
                  onChange={(_, newValue) => {
                    setFormData({
                      ...formData,
                      property_id: newValue?.id ? parseInt(newValue.id) : 0,
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Propiedad"
                      required
                      size="small"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email del Inquilino"
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: parseInt(e.target.value) || 0 })}
                  required
                  size="small"
                  type="number"
                  helperText="Ingrese el ID del inquilino"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de Inicio"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de Fin"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Renta Mensual"
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData({ ...formData, monthly_rent: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Depósito"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Términos y Condiciones"
                  multiline
                  rows={4}
                  size="small"
                  placeholder="Ingresa los términos y condiciones del contrato..."
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
                      : isEditing
                      ? 'Actualizar Contrato'
                      : 'Crear Contrato'}
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

export default ContractForm; 