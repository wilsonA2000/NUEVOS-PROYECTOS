import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Rating,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useRatings } from '../../hooks/useRatings';

export const RatingForm: React.FC = () => {
  const navigate = useNavigate();
  const { createRating } = useRatings();
  const [formData, setFormData] = useState({
    overall_rating: 0,
    comment: '',
    rating_type: 'general',
  });
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación de calificación
    if (!formData.overall_rating || formData.overall_rating < 1 || formData.overall_rating > 10) {
      setError('La calificación debe estar entre 1 y 10');
      return;
    }

    try {
      await createRating.mutateAsync(formData);
      navigate('/app/ratings');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear la calificación');
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Nueva Calificación
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box mb={3}>
              <Typography component="legend">Calificación General</Typography>
              <Rating
                name="overall_rating"
                value={formData.overall_rating / 2}
                onChange={(_, value) => setFormData({ ...formData, overall_rating: (value || 0) * 2 })}
                size="large"
                max={5}
                precision={0.5}
              />
              <Typography variant="caption" color="textSecondary">
                Escala: 1-10 (mostrada como 0.5-5 estrellas)
              </Typography>
            </Box>

            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo de Calificación</InputLabel>
              <Select
                value={formData.rating_type}
                onChange={(e) => setFormData({ ...formData, rating_type: e.target.value })}
                label="Tipo de Calificación"
              >
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="landlord_to_tenant">Propietario a Inquilino</MenuItem>
                <MenuItem value="tenant_to_landlord">Inquilino a Propietario</MenuItem>
                <MenuItem value="service_provider">Proveedor de Servicios</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              margin="normal"
              label="Comentario"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createRating.isPending}
              >
                {createRating.isPending ? 'Creando...' : 'Crear Calificación'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/app/ratings')}
              >
                Cancelar
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}; 