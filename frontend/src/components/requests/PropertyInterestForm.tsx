import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Grid,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import requestService, { CreatePropertyInterestData } from '../../services/requestService';
import { Property } from '../../types/property';
import { useAuth } from '../../hooks/useAuth';
import { useBusinessNotifications } from '../../hooks/useBusinessNotifications';

interface PropertyInterestFormProps {
  property: Property;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PropertyInterestForm: React.FC<PropertyInterestFormProps> = ({
  property,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { onPropertyInterest } = useBusinessNotifications();
  const [formData, setFormData] = useState<CreatePropertyInterestData>({
    property: property.id,
    description: '',
    employment_type: '',
    lease_duration_months: 12,
    number_of_occupants: 1,
    has_pets: false,
    pet_details: '',
    smoking_allowed: false,
    has_rental_references: false,
    has_employment_proof: false,
    has_credit_check: false
  });

  const [preferredMoveInDate, setPreferredMoveInDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const employmentTypes = [
    { value: 'empleado_tiempo_completo', label: 'Empleado Tiempo Completo' },
    { value: 'empleado_medio_tiempo', label: 'Empleado Medio Tiempo' },
    { value: 'contratista', label: 'Contratista/Freelancer' },
    { value: 'empresario', label: 'Empresario/Negocio Propio' },
    { value: 'estudiante', label: 'Estudiante' },
    { value: 'jubilado', label: 'Jubilado/Pensionado' },
    { value: 'otro', label: 'Otro' }
  ];

  const leaseDurations = [
    { value: 6, label: '6 meses' },
    { value: 12, label: '1 año' },
    { value: 24, label: '2 años' },
    { value: 36, label: '3 años' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        preferred_move_in_date: preferredMoveInDate || undefined,
        title: `Interés en: ${property.title}`
      };

      await requestService.createPropertyInterestRequest(submitData);

      // 📧 NOTIFICACIONES AUTOMÁTICAS: Notificar al propietario sobre el interés
      if (user && property.landlord) {
        try {
          await onPropertyInterest(property, formData.description);
          console.log('📧 PropertyInterestForm: Notificación automática enviada al propietario');
        } catch (notificationError) {
          console.warn('⚠️ PropertyInterestForm: Error enviando notificación automática:', notificationError);
          // No afectar el flujo principal si fallan las notificaciones
        }
      }

      setSuccess(true);
      
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating property interest request:', error);
      setError(error.response?.data?.message || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreatePropertyInterestData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (success) {
    return (
      <Card>
        <CardContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            ¡Solicitud enviada exitosamente!
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Tu solicitud de interés ha sido enviada al arrendador. Te notificaremos cuando responda.
          </Typography>
          <Button variant="contained" onClick={onSuccess} fullWidth>
            Continuar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Solicitud de Interés en Propiedad
          </Typography>

          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {property.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              {property.address}
            </Typography>
            <Chip 
              label={`${requestService.formatCurrency(property.rent_price)}/mes`}
              color="primary"
              size="small"
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Mensaje al arrendador"
                  placeholder="Cuéntale al arrendador por qué estás interesado en esta propiedad..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo de Empleo</InputLabel>
                  <Select
                    value={formData.employment_type}
                    onChange={(e) => handleInputChange('employment_type', e.target.value)}
                    label="Tipo de Empleo"
                  >
                    {employmentTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Ingresos Mensuales (COP)"
                  value={formData.monthly_income || ''}
                  onChange={(e) => handleInputChange('monthly_income', Number(e.target.value))}
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Duración del Contrato</InputLabel>
                  <Select
                    value={formData.lease_duration_months}
                    onChange={(e) => handleInputChange('lease_duration_months', e.target.value)}
                    label="Duración del Contrato"
                  >
                    {leaseDurations.map((duration) => (
                      <MenuItem key={duration.value} value={duration.value}>
                        {duration.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Número de Ocupantes"
                  value={formData.number_of_occupants}
                  onChange={(e) => handleInputChange('number_of_occupants', Number(e.target.value))}
                  InputProps={{
                    inputProps: { min: 1, max: 10 }
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha Preferida de Mudanza"
                  value={preferredMoveInDate}
                  onChange={(e) => setPreferredMoveInDate(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0]
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Información Adicional
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.has_pets}
                          onChange={(e) => handleInputChange('has_pets', e.target.checked)}
                        />
                      }
                      label="Tengo mascotas"
                    />
                    {formData.has_pets && (
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Detalles de las mascotas"
                        placeholder="Tipo, raza, edad, etc."
                        value={formData.pet_details}
                        onChange={(e) => handleInputChange('pet_details', e.target.value)}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.smoking_allowed}
                          onChange={(e) => handleInputChange('smoking_allowed', e.target.checked)}
                        />
                      }
                      label="Permito fumar en la propiedad"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.has_rental_references}
                          onChange={(e) => handleInputChange('has_rental_references', e.target.checked)}
                        />
                      }
                      label="Tengo referencias de alquiler"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.has_employment_proof}
                          onChange={(e) => handleInputChange('has_employment_proof', e.target.checked)}
                        />
                      }
                      label="Tengo comprobantes de ingresos"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.has_credit_check}
                          onChange={(e) => handleInputChange('has_credit_check', e.target.checked)}
                        />
                      }
                      label="Autorizo verificación crediticia"
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button variant="outlined" onClick={onCancel}>
                    Cancelar
                  </Button>
                  <LoadingButton
                    type="submit"
                    variant="contained"
                    loading={loading}
                    disabled={!formData.description || !formData.employment_type}
                  >
                    Enviar Solicitud
                  </LoadingButton>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
  );
};

export default PropertyInterestForm;