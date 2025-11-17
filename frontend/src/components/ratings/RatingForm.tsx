import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Rating, Grid, Alert, CircularProgress, Chip, Divider } from '@mui/material';
import { Star as StarIcon, Send as SendIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import api from '../../services/api';

export interface RatingFormProps {
  targetType: 'user' | 'property' | 'service';
  targetId: string;
  targetName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RatingForm: React.FC<RatingFormProps> = ({ targetType, targetId, targetName, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState({ overall: 0, communication: 0, serviceQuality: 0, cleanliness: 0, value: 0, location: 0 });
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      if (ratings.overall === 0) {
        setError('Por favor califica al menos la puntuación general');
        setLoading(false);
        return;
      }
      const ratingData: any = { target_type: targetType, target_id: targetId, overall_rating: ratings.overall, comment: comment.trim() };
      if (targetType === 'user') {
        if (ratings.communication > 0) ratingData.communication_rating = ratings.communication;
        if (ratings.serviceQuality > 0) ratingData.service_quality_rating = ratings.serviceQuality;
      }
      await api.post('/ratings/', ratingData);
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar calificación.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (value: number): string => {
    switch (value) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return 'Sin calificar';
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" gutterBottom>¡Calificación Enviada!</Typography>
            <Typography variant="body2" color="text.secondary">Gracias por tu opinión</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StarIcon color="primary" />Nueva Calificación
          </Typography>
          {targetName && <Chip label={targetName} color="primary" variant="outlined" />}
        </Box>
        <Divider sx={{ mb: 3 }} />
        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">Calificación General *</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Rating name="overall-rating" value={ratings.overall} onChange={(_, value) => setRatings({ ...ratings, overall: value || 0 })} size="large" disabled={loading} />
              <Typography variant="body2" color="text.secondary">{getRatingLabel(ratings.overall)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">Comentario (opcional)</Typography>
            <TextField fullWidth multiline rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comparte tu experiencia..." disabled={loading} inputProps={{ maxLength: 1000 }} helperText={`${comment.length}/1000 caracteres`} />
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
          {onCancel && <Button variant="outlined" onClick={onCancel} disabled={loading}>Cancelar</Button>}
          <Button variant="contained" onClick={handleSubmit} disabled={loading || ratings.overall === 0} startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}>{loading ? 'Enviando...' : 'Enviar Calificación'}</Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RatingForm;
