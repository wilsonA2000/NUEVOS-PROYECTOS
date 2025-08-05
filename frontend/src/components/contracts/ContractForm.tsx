import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { Contract, CreateContractDto, UpdateContractDto } from '../../types/contract';

interface ContractFormProps {
  contract?: Contract;
  isEdit?: boolean;
}

export const ContractForm: React.FC<ContractFormProps> = ({ contract, isEdit = false }) => {
  const navigate = useNavigate();
  const { createContract, updateContract } = useContracts();
  const [formData, setFormData] = React.useState<CreateContractDto | UpdateContractDto>(
    contract || {
      propertyId: '',
      tenantId: '',
      startDate: '',
      endDate: '',
      rentAmount: 0,
      depositAmount: 0,
      terms: '',
      documents: [],
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && contract) {
        await updateContract.mutateAsync({ id: contract.id, data: formData as UpdateContractDto });
      } else {
        await createContract.mutateAsync(formData as CreateContractDto);
      }
      navigate('/app/contracts');
    } catch (error) {
      console.error('Error al guardar el contrato:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {isEdit ? 'Editar Contrato' : 'Nuevo Contrato'}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID de Propiedad"
                name="propertyId"
                value={formData.propertyId}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID de Inquilino"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Inicio"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Fin"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto de Renta"
                name="rentAmount"
                type="number"
                value={formData.rentAmount}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto de Depósito"
                name="depositAmount"
                type="number"
                value={formData.depositAmount}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Términos"
                name="terms"
                value={formData.terms}
                onChange={handleChange}
                multiline
                rows={4}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/app/contracts')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={createContract.isPending || updateContract.isPending}
                >
                  {isEdit ? 'Actualizar' : 'Crear'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}; 