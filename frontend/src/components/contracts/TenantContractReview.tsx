/**
 * Componente para revisión de contratos por parte del arrendatario
 * Permite aprobar o solicitar cambios en contratos enviados por el arrendador
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Edit as RequestChangesIcon,
  Visibility as ViewIcon,
  Description as ContractIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { contractService } from '../../services/contractService';

interface TenantContractReviewProps {
  contract: {
    id: string;
    title: string;
    status: string;
    primary_party?: {
      full_name: string;
      email: string;
    };
    property?: {
      title: string;
      address: string;
    };
    monthly_rent?: number;
    start_date?: string;
    end_date?: string;
    created_at: string;
  };
  onReviewComplete?: () => void;
}

const TenantContractReview: React.FC<TenantContractReviewProps> = ({ 
  contract, 
  onReviewComplete 
}) => {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [changesDialogOpen, setChangesDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await contractService.tenantContractReview(contract.id, 'approve', comments);
      console.log('✅ Contrato aprobado exitosamente');
      setApproveDialogOpen(false);
      setComments('');
      onReviewComplete?.();
    } catch (error) {
      console.error('Error approving contract:', error);
      alert('Error al aprobar el contrato. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!comments.trim()) {
      alert('Por favor, especifica qué cambios solicitas');
      return;
    }

    setLoading(true);
    try {
      await contractService.tenantContractReview(contract.id, 'request_changes', comments);
      console.log('✅ Solicitud de cambios enviada exitosamente');
      setChangesDialogOpen(false);
      setComments('');
      onReviewComplete?.();
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Error al solicitar cambios. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" component="h3">
              📋 {contract.title}
            </Typography>
            <Chip 
              label="Pendiente de tu revisión" 
              color="warning" 
              icon={<WarningIcon />}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Arrendador
              </Typography>
              <Typography variant="body1">
                {contract.primary_party?.full_name || 'No disponible'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {contract.primary_party?.email}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Propiedad
              </Typography>
              <Typography variant="body1">
                {contract.property?.title || 'No disponible'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {contract.property?.address}
              </Typography>
            </Grid>

            {contract.monthly_rent && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Canon mensual
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(contract.monthly_rent)}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Recibido el
              </Typography>
              <Typography variant="body1">
                {formatDate(contract.created_at)}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Alert severity="info" icon={<ContractIcon />}>
            <Typography variant="body2">
              <strong>¿Qué puedes hacer?</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              • <strong>Aprobar:</strong> Si estás de acuerdo con todos los términos
              • <strong>Solicitar cambios:</strong> Si necesitas modificaciones específicas
              • <strong>Ver detalles:</strong> Revisar todos los términos del contrato
            </Typography>
          </Alert>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => setApproveDialogOpen(true)}
            >
              Aprobar
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RequestChangesIcon />}
              onClick={() => setChangesDialogOpen(true)}
            >
              Solicitar Cambios
            </Button>
          </Stack>
          
          <Button
            variant="outlined"
            startIcon={<ViewIcon />}
            href={`/app/contracts/${contract.id}`}
            target="_blank"
          >
            Ver Detalles
          </Button>
        </CardActions>
      </Card>

      {/* Dialog para aprobar */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          ✅ Aprobar Contrato
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            ¿Estás seguro de que quieres aprobar este contrato? Una vez aprobado, se procederá con el siguiente paso del proceso.
          </Typography>
          
          <TextField
            label="Comentarios (opcional)"
            multiline
            rows={3}
            fullWidth
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Agrega cualquier comentario adicional..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApprove} 
            variant="contained" 
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ApproveIcon />}
          >
            {loading ? 'Aprobando...' : 'Confirmar Aprobación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para solicitar cambios */}
      <Dialog open={changesDialogOpen} onClose={() => setChangesDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          ✏️ Solicitar Cambios
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Especifica qué cambios necesitas en el contrato. Sé lo más específico posible para facilitar las negociaciones.
          </Typography>
          
          <TextField
            label="Cambios solicitados *"
            multiline
            rows={5}
            fullWidth
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Ejemplo: Solicito cambiar la fecha de inicio del contrato del 1 de septiembre al 15 de septiembre. También me gustaría incluir que las mascotas están permitidas..."
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangesDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleRequestChanges} 
            variant="contained" 
            color="warning"
            disabled={loading || !comments.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <RequestChangesIcon />}
          >
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TenantContractReview;