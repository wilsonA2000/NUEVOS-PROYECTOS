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
  Alert,
  Chip,
} from '@mui/material';
import {
  Assignment as ContractIcon,
  AutoAwesome as ProfessionalIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { Contract, CreateContractDto, UpdateContractDto } from '../../types/contract';
import { LandlordContractForm } from './LandlordContractForm';

interface ContractFormProps {
  contract?: Contract;
  isEdit?: boolean;
  propertyId?: string;
  tenantId?: string;
}

export const ContractForm: React.FC<ContractFormProps> = ({ 
  contract, 
  isEdit = false, 
  propertyId, 
  tenantId 
}) => {
  const navigate = useNavigate();
  const { createContract, updateContract } = useContracts();
  const [useProfessionalMode, setUseProfessionalMode] = React.useState(true);
  const [formData, setFormData] = React.useState<CreateContractDto | UpdateContractDto>(
    contract || {
      contract_type: 'rental_urban',
      secondary_party: '',
      title: '',
      description: '',
      content: '',
      start_date: '',
      end_date: '',
      monthly_rent: 0,
      security_deposit: 0,
      property: '',
      is_renewable: true,
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

  // Show landlord contract form by default (new system)
  if (useProfessionalMode) {
    return (
      <LandlordContractForm 
        contract={contract}
        isEdit={isEdit}
        propertyId={propertyId}
        contractId={contract?.id}
        onSuccess={() => navigate('/app/contracts')}
        onCancel={() => navigate('/app/contracts')}
      />
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <ContractIcon />
            {isEdit ? 'Editar Contrato' : 'Nuevo Contrato'}
          </Typography>
          <Box display="flex" gap={1}>
            <Chip 
              label="Modo Básico" 
              color="default" 
              variant="outlined"
            />
            <Button
              startIcon={<ProfessionalIcon />}
              variant="outlined"
              size="small"
              onClick={() => setUseProfessionalMode(true)}
            >
              Usar Modo Profesional
            </Button>
          </Box>
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Recomendación:</strong> Usa el Modo Profesional para contratos con plantillas legales completas, 
            generación automática de contenido y asistente paso a paso.
          </Typography>
        </Alert>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título del Contrato"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Contrato</InputLabel>
                <Select
                  name="contract_type"
                  value={formData.contract_type}
                  onChange={handleChange}
                  label="Tipo de Contrato"
                >
                  <MenuItem value="rental_urban">Arrendamiento de Vivienda Urbana</MenuItem>
                  <MenuItem value="rental_commercial">Arrendamiento de Local Comercial</MenuItem>
                  <MenuItem value="rental_room">Arrendamiento de Habitación</MenuItem>
                  <MenuItem value="service_provider">Contrato de Prestación de Servicios</MenuItem>
                  <MenuItem value="other">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID de Propiedad (Opcional)"
                name="property"
                value={formData.property}
                onChange={handleChange}
                helperText="UUID de la propiedad relacionada"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID de Inquilino/Contraparte"
                name="secondary_party"
                value={formData.secondary_party}
                onChange={handleChange}
                required
                helperText="UUID del usuario inquilino o contraparte"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Inicio"
                name="start_date"
                type="date"
                value={formData.start_date}
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
                name="end_date"
                type="date"
                value={formData.end_date}
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
                label="Renta Mensual"
                name="monthly_rent"
                type="number"
                value={formData.monthly_rent}
                onChange={handleChange}
                InputProps={{
                  startAdornment: '$',
                }}
                helperText="Monto en pesos colombianos"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Depósito de Garantía"
                name="security_deposit"
                type="number"
                value={formData.security_deposit}
                onChange={handleChange}
                InputProps={{
                  startAdornment: '$',
                }}
                helperText="Monto en pesos colombianos"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={2}
                helperText="Descripción breve del contrato"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contenido del Contrato"
                name="content"
                value={formData.content}
                onChange={handleChange}
                multiline
                rows={6}
                required
                helperText="Contenido completo del contrato"
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