import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Grid,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  Pets as PetsIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  AttachMoney as MoneyIcon,
  Group as GroupIcon,
  SmokingRooms as SmokingIcon,
  VerifiedUser as VerifiedIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

interface MatchRequestCardProps {
  request: MatchRequest;
  onAccept: (id: string, message: string) => void;
  onReject: (id: string, message: string) => void;
  onMarkViewed: (id: string) => void;
  isLoading?: boolean;
}

interface MatchRequest {
  id: string;
  match_code: string;
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tenant_message: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string;
  monthly_income: number;
  employment_type: string;
  preferred_move_in_date: string;
  lease_duration_months: number;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details: string;
  smoking_allowed: boolean;
  property_title: string;
  property_rent_price: number;
  compatibility_score: number;
  created_at: string;
  expires_at: string;
  landlord_response?: string;
}

const MatchRequestCard: React.FC<MatchRequestCardProps> = ({
  request,
  onAccept,
  onReject,
  onMarkViewed,
  isLoading = false
}) => {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      default: return 'Baja';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'viewed': return 'info';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'viewed': return 'Vista';
      case 'accepted': return 'Aceptada';
      case 'rejected': return 'Rechazada';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Buena';
    if (score >= 40) return 'Moderada';
    return 'Baja';
  };

  const getIncomeRatio = () => {
    if (request.monthly_income && request.property_rent_price) {
      return (request.monthly_income / request.property_rent_price).toFixed(1);
    }
    return 'N/A';
  };

  const getIncomeStatus = () => {
    const ratio = request.monthly_income / request.property_rent_price;
    if (ratio >= 3) return { color: 'success', label: 'Excelente' };
    if (ratio >= 2.5) return { color: 'warning', label: 'Bueno' };
    if (ratio >= 2) return { color: 'error', label: 'Mínimo' };
    return { color: 'error', label: 'Insuficiente' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(request.expires_at);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expirada';
    if (diffDays === 1) return '1 día restante';
    return `${diffDays} días restantes`;
  };

  const handleAccept = () => {
    onAccept(request.id, responseMessage);
    setShowAcceptDialog(false);
    setResponseMessage('');
  };

  const handleReject = () => {
    onReject(request.id, responseMessage);
    setShowRejectDialog(false);
    setResponseMessage('');
  };

  const handleMarkViewed = () => {
    if (request.status === 'pending') {
      onMarkViewed(request.id);
    }
    setShowDetails(true);
  };

  const canRespond = ['pending', 'viewed'].includes(request.status);

  return (
    <>
      <Card 
        sx={{ 
          mb: 2, 
          border: request.status === 'pending' ? '2px solid' : '1px solid',
          borderColor: request.status === 'pending' ? 'warning.main' : 'divider',
          position: 'relative'
        }}
      >
        {/* Header con información básica */}
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{request.tenant_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Código: {request.match_code}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip
                  label={getPriorityLabel(request.priority)}
                  color={getPriorityColor(request.priority) as any}
                  size="small"
                />
                <Chip
                  label={getStatusLabel(request.status)}
                  color={getStatusColor(request.status) as any}
                  size="small"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {formatDateTime(request.created_at)}
              </Typography>
            </Box>
          </Box>

          {/* Puntaje de compatibilidad */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                <StarIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Compatibilidad: {request.compatibility_score}%
              </Typography>
              <Chip
                label={getCompatibilityLabel(request.compatibility_score)}
                color={getCompatibilityColor(request.compatibility_score) as any}
                size="small"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={request.compatibility_score}
              color={getCompatibilityColor(request.compatibility_score) as any}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          {/* Información clave en resumen */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">
                  <strong>Ingresos:</strong> ${request.monthly_income?.toLocaleString()}
                  <Chip
                    label={`${getIncomeRatio()}x renta`}
                    color={getIncomeStatus().color as any}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WorkIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">
                  <strong>Empleo:</strong> {request.employment_type}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">
                  <strong>Mudanza:</strong> {formatDate(request.preferred_move_in_date)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <GroupIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2">
                  <strong>Ocupantes:</strong> {request.number_of_occupants}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Badges de verificación */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {request.has_rental_references && (
              <Chip
                icon={<VerifiedIcon />}
                label="Referencias"
                color="success"
                size="small"
                variant="outlined"
              />
            )}
            {request.has_employment_proof && (
              <Chip
                icon={<WorkIcon />}
                label="Comprobante ingresos"
                color="success"
                size="small"
                variant="outlined"
              />
            )}
            {request.has_credit_check && (
              <Chip
                icon={<VerifiedIcon />}
                label="Verificación crediticia"
                color="success"
                size="small"
                variant="outlined"
              />
            )}
            {request.has_pets && (
              <Chip
                icon={<PetsIcon />}
                label="Mascotas"
                color="warning"
                size="small"
                variant="outlined"
              />
            )}
            {request.smoking_allowed && (
              <Chip
                icon={<SmokingIcon />}
                label="Fumador"
                color="warning"
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {/* Mensaje del arrendatario */}
          <Accordion sx={{ mt: 2, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">
                <strong>Mensaje del arrendatario</strong>
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                "{request.tenant_message}"
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Información de expiración */}
          {canRespond && (
            <Alert
              severity={getTimeRemaining().includes('Expirada') ? 'error' : 'info'}
              sx={{ mt: 2 }}
              icon={<TimerIcon />}
            >
              <Typography variant="body2">
                <strong>{getTimeRemaining()}</strong> para responder
              </Typography>
            </Alert>
          )}

          {/* Respuesta del arrendador si existe */}
          {request.landlord_response && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Tu respuesta:</strong>
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                "{request.landlord_response}"
              </Typography>
            </Box>
          )}
        </CardContent>

        {/* Acciones */}
        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box>
            <Tooltip title="Ver detalles completos">
              <IconButton onClick={handleMarkViewed} color="primary">
                <Badge badgeContent={request.status === 'pending' ? 1 : 0} color="warning">
                  <VisibilityIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>

          {canRespond && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CloseIcon />}
                onClick={() => setShowRejectDialog(true)}
                disabled={isLoading}
                size="small"
              >
                Rechazar
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={() => setShowAcceptDialog(true)}
                disabled={isLoading}
                size="small"
              >
                Aceptar
              </Button>
            </Box>
          )}
        </CardActions>
      </Card>

      {/* Dialog para aceptar */}
      <Dialog open={showAcceptDialog} onClose={() => setShowAcceptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'success.main' }}>
          <CheckIcon sx={{ mr: 1 }} />
          Aceptar Solicitud de Match
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Estás a punto de aceptar la solicitud de {request.tenant_name} para la propiedad "{request.property_title}".
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mensaje para el arrendatario (opcional)"
            placeholder="Ej: Me complace aceptar su solicitud. Coordinemos una reunión para continuar con el proceso..."
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAcceptDialog(false)}>Cancelar</Button>
          <Button onClick={handleAccept} variant="contained" color="success">
            Confirmar Aceptación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para rechazar */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>
          <CloseIcon sx={{ mr: 1 }} />
          Rechazar Solicitud de Match
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Estás a punto de rechazar la solicitud de {request.tenant_name}.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mensaje para el arrendatario (opcional)"
            placeholder="Ej: Gracias por tu interés. En este momento hemos decidido continuar con otro candidato..."
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
          <Button onClick={handleReject} variant="contained" color="error">
            Confirmar Rechazo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MatchRequestCard;