import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Button,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Badge,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
  VerifiedUser as VerifiedIcon,
  Error as ErrorIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
  ContactPhone as ContactIcon,
  EventAvailable as CalendarIcon,
  TaskAlt as ApproveIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface CandidateScore {
  total: number;
  breakdown: {
    financial: number;
    background: number;
    compatibility: number;
  };
  rating: string;
  recommendation: string;
}

interface FinancialMetrics {
  monthly_income: number | null;
  income_ratio: number | null;
  credit_score_verified: number | null; // Score oficial de VeriHome
  credit_score_reported: number | null; // Score auto-reportado
  employment_months: number;
}

interface VeriHomeRating {
  initial_rating: number | null;
  verification_score: number | null;
  verified_by: string | null;
  verified_at: string | null;
  is_verified: boolean;
}

interface MatchRequestInfo {
  id: string;
  match_code: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  tenant_message: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  preferred_move_in_date: string | null;
  lease_duration_months: number;
  monthly_income: number | null;
  employment_type: string;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details: string | null;
  smoking_allowed: boolean;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface Flag {
  type: 'critical' | 'warning' | 'excellent' | 'good';
  message: string;
  field: string;
}

interface VerificationStatus {
  identity: boolean;
  income: boolean;
  employment: boolean;
  references: boolean;
  background: boolean;
  total_verified: number;
  total_pending: number;
  verification_percentage: number;
}

interface BasicInfo {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  date_joined: string | null;
  is_verified: boolean;
}

interface TenantInfo {
  monthly_income: number | null;
  job_title: string | null;
  company: string | null;
  employment_type: string | null;
  education_level: string | null;
  has_pets: boolean;
  pet_details: string | null;
  emergency_contact: any;
}

interface CandidateEvaluationData {
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  score: CandidateScore;
  verihome_rating: VeriHomeRating;
  financial_metrics: FinancialMetrics;
  verification_status: VerificationStatus;
  red_flags: Flag[];
  green_flags: Flag[];
  rental_history: any[];
  match_request_info: MatchRequestInfo | null;
  recommendation: string;
  basic_info: BasicInfo;
  tenant_info: TenantInfo | null;
}

interface CandidateEvaluationViewProps {
  candidateId: string;
  propertyId?: string;
  matchRequestId?: string;
  onClose?: () => void;
  onMatchDecision?: (action: 'accept' | 'reject', result: any) => void;
}

const CandidateEvaluationView: React.FC<CandidateEvaluationViewProps> = ({
  candidateId,
  propertyId,
  matchRequestId,
  onClose,
  onMatchDecision
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CandidateEvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decisionSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCandidateEvaluation();
  }, [candidateId, propertyId, matchRequestId]);

  const fetchCandidateEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 CandidateEvaluationView Debug - Props:', { candidateId, propertyId, matchRequestId });

      // Construir URL con parámetros apropiados
      let url = `/api/v1/users/${candidateId}/evaluation/`;
      const params = new URLSearchParams();
      
      if (matchRequestId) {
        console.log('✅ Using matchRequestId:', matchRequestId);
        params.append('match_request_id', matchRequestId);
      } else if (propertyId) {
        console.log('⚠️ Using propertyId fallback:', propertyId);
        params.append('property_id', propertyId);
      } else {
        console.log('❌ No matchRequestId or propertyId - using basic evaluation');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('🔍 Final API URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar la evaluación');
      }

      const evaluationData = await response.json();
      setData(evaluationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchDecision = async (action: 'accept' | 'reject') => {
    if (!matchRequestId) {
      setError('No hay solicitud de match para procesar');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/v1/users/${candidateId}/evaluation/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          match_request_id: matchRequestId,
          action: action
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar decisión');
      }

      const result = await response.json();
      
      // Llamar callback si existe
      if (onMatchDecision) {
        onMatchDecision(action, result);
      }
      
      // Actualizar los datos locales
      if (data && data.match_request_info) {
        setData({
          ...data,
          match_request_info: {
            ...data.match_request_info,
            status: result.match_status,
            status_display: action === 'accept' ? 'Aceptado' : 'Rechazado'
          }
        });
      }

      // Scroll suave a la sección de decisión después de la aprobación/rechazo
      setTimeout(() => {
        decisionSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return theme.palette.success.main;
    if (score >= 70) return theme.palette.info.main;
    if (score >= 55) return theme.palette.warning.main;
    if (score >= 40) return theme.palette.orange?.main || '#ff9800';
    return theme.palette.error.main;
  };

  const getRatingLabel = (rating: string) => {
    const labels: Record<string, string> = {
      excelente: 'EXCELENTE',
      muy_bueno: 'MUY BUENO',
      bueno: 'BUENO',
      aceptable: 'ACEPTABLE',
      requiere_revision: 'REQUIERE REVISIÓN'
    };
    return labels[rating] || rating.toUpperCase();
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const ScoreCircle: React.FC<{ score: number; size?: 'small' | 'medium' | 'large' }> = ({ 
    score, 
    size = 'large' 
  }) => {
    const circleSize = size === 'large' ? 120 : size === 'medium' ? 80 : 60;
    const color = getScoreColor(score);

    return (
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={score}
          size={circleSize}
          thickness={4}
          sx={{
            color,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant={size === 'large' ? 'h4' : 'h6'}
            component="div"
            color="text.primary"
            fontWeight="bold"
          >
            {score}
          </Typography>
          <Typography
            variant="caption"
            component="div"
            color="text.secondary"
          >
            /100
          </Typography>
        </Box>
      </Box>
    );
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    status?: 'excellent' | 'good' | 'acceptable' | 'poor';
    icon?: React.ReactNode;
    subtitle?: string;
  }> = ({ title, value, status, icon, subtitle }) => {
    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'excellent': return theme.palette.success.main;
        case 'good': return theme.palette.info.main;
        case 'acceptable': return theme.palette.warning.main;
        case 'poor': return theme.palette.error.main;
        default: return theme.palette.text.primary;
      }
    };

    return (
      <Card sx={{ height: '100%', border: `2px solid ${getStatusColor(status)}20` }}>
        <CardContent sx={{ textAlign: 'center', py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1, color: getStatusColor(status) }}>
              {value}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.primary" fontWeight="medium">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  const FlagAlert: React.FC<{ flags: Flag[]; type: 'red' | 'green' }> = ({ flags, type }) => {
    if (!flags || flags.length === 0) return null;

    const isRed = type === 'red';
    const severity = isRed ? 'error' : 'success';
    const title = isRed ? 'Alertas Importantes' : 'Aspectos Positivos';
    const icon = isRed ? <WarningIcon /> : <CheckCircleIcon />;

    return (
      <Alert severity={severity} sx={{ mb: 2 }}>
        <AlertTitle>{title} ({flags.length})</AlertTitle>
        <List dense>
          {flags.slice(0, 5).map((flag, index) => (
            <ListItem key={index} disablePadding>
              <ListItemIcon sx={{ minWidth: 20 }}>
                {icon}
              </ListItemIcon>
              <ListItemText primary={flag.message} />
            </ListItem>
          ))}
        </List>
      </Alert>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando evaluación...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error || 'No se pudo cargar la evaluación del candidato'}
        <Box sx={{ mt: 2 }}>
          <Button onClick={fetchCandidateEvaluation} variant="outlined">
            Reintentar
          </Button>
        </Box>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Header Simple del Candidato */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 64, height: 64, bgcolor: theme.palette.primary.main }}>
                <PersonIcon fontSize="large" />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {data.basic_info.full_name}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip 
                  icon={<EmailIcon />} 
                  label={data.basic_info.email} 
                  size="small" 
                  variant="outlined"
                />
                {data.basic_info.phone && (
                  <Chip 
                    icon={<PhoneIcon />} 
                    label={data.basic_info.phone} 
                    size="small" 
                    variant="outlined"
                  />
                )}
                {data.basic_info.city && (
                  <Chip 
                    icon={<LocationIcon />} 
                    label={`${data.basic_info.city}, ${data.basic_info.country}`} 
                    size="small" 
                    variant="outlined"
                  />
                )}
                <Chip 
                  icon={data.basic_info.is_verified ? <VerifiedIcon /> : <ErrorIcon />}
                  label={data.basic_info.is_verified ? 'Verificado' : 'Sin verificar'}
                  color={data.basic_info.is_verified ? 'success' : 'error'}
                  size="small"
                />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Mensaje del Candidato */}
      {data.match_request_info?.tenant_message && (
        <Card sx={{ mb: 3, border: `2px solid ${theme.palette.info.main}20` }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ContactIcon sx={{ color: theme.palette.info.main, mr: 1 }} />
              <Typography variant="h6" color="info.main">
                Mensaje del Candidato
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1, 
              fontStyle: 'italic',
              border: `1px solid ${theme.palette.grey[200]}`
            }}>
              "{data.match_request_info.tenant_message}"
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Información Detallada de la Solicitud */}
      {data.match_request_info && (
        <>
          {/* Información de Contacto */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ContactIcon sx={{ mr: 1 }} />
                Información de Contacto
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhoneIcon sx={{ color: theme.palette.primary.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Teléfono Preferido</Typography>
                      <Typography variant="body1">
                        {data.match_request_info.tenant_phone || data.basic_info.phone || 'No especificado'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon sx={{ color: theme.palette.primary.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Email de Contacto</Typography>
                      <Typography variant="body1">
                        {data.match_request_info.tenant_email || data.basic_info.email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Información Financiera Detallada */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <MoneyIcon sx={{ mr: 1 }} />
                Situación Financiera
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MoneyIcon sx={{ color: theme.palette.success.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Ingresos Mensuales Declarados</Typography>
                      <Typography variant="h6" color="success.main">
                        {formatCurrency(data.match_request_info.monthly_income)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WorkIcon sx={{ color: theme.palette.primary.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Tipo de Empleo</Typography>
                      <Typography variant="body1">
                        {data.match_request_info.employment_type === 'employed' && 'Empleado'}
                        {data.match_request_info.employment_type === 'self_employed' && 'Independiente'}
                        {data.match_request_info.employment_type === 'freelancer' && 'Freelancer'}
                        {data.match_request_info.employment_type === 'student' && 'Estudiante'}
                        {data.match_request_info.employment_type === 'retired' && 'Pensionado'}
                        {data.match_request_info.employment_type === 'unemployed' && 'Desempleado'}
                        {data.match_request_info.employment_type === 'other' && 'Otro'}
                        {!data.match_request_info.employment_type && 'No especificado'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Documentación Disponible */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Documentación Disponible:</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    icon={data.match_request_info.has_employment_proof ? <CheckCircleIcon /> : <WarningIcon />}
                    label="Comprobante de Ingresos"
                    color={data.match_request_info.has_employment_proof ? "success" : "warning"}
                    size="small"
                  />
                  <Chip
                    icon={data.match_request_info.has_rental_references ? <CheckCircleIcon /> : <WarningIcon />}
                    label="Referencias de Alquiler"
                    color={data.match_request_info.has_rental_references ? "success" : "warning"}
                    size="small"
                  />
                  <Chip
                    icon={data.match_request_info.has_credit_check ? <CheckCircleIcon /> : <WarningIcon />}
                    label="Autoriza Verificación Crediticia"
                    color={data.match_request_info.has_credit_check ? "success" : "warning"}
                    size="small"
                  />
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Detalles del Arrendamiento Solicitado */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 1 }} />
                Detalles del Arrendamiento Solicitado
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CalendarIcon sx={{ color: theme.palette.info.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Fecha Preferida de Mudanza</Typography>
                      <Typography variant="body1">
                        {data.match_request_info.preferred_move_in_date 
                          ? new Date(data.match_request_info.preferred_move_in_date).toLocaleDateString('es-CO')
                          : 'Flexible'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ScheduleIcon sx={{ color: theme.palette.info.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Duración de Contrato Deseada</Typography>
                      <Typography variant="body1">
                        {data.match_request_info.lease_duration_months} meses
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ color: theme.palette.secondary.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Número de Ocupantes</Typography>
                      <Typography variant="body1">
                        {data.match_request_info.number_of_occupants || 1} persona(s)
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <InfoIcon sx={{ color: theme.palette.warning.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Prioridad de la Solicitud</Typography>
                      <Chip 
                        label={
                          data.match_request_info.priority === 'low' ? 'Baja' :
                          data.match_request_info.priority === 'medium' ? 'Media' :
                          data.match_request_info.priority === 'high' ? 'Alta' :
                          data.match_request_info.priority === 'urgent' ? 'Urgente' :
                          'Media'
                        }
                        color={
                          data.match_request_info.priority === 'urgent' ? 'error' :
                          data.match_request_info.priority === 'high' ? 'warning' :
                          data.match_request_info.priority === 'medium' ? 'info' : 'default'
                        }
                        size="small"
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Información de Estilo de Vida */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 1 }} />
                Estilo de Vida y Preferencias
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ color: theme.palette.secondary.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Mascotas</Typography>
                      <Typography variant="body1">
                        {data.match_request_info.has_pets ? (
                          <>
                            <Chip label="Sí tiene mascotas" color="info" size="small" sx={{ mr: 1 }} />
                            {data.match_request_info.pet_details && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Detalles: {data.match_request_info.pet_details}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <Chip label="No tiene mascotas" color="default" size="small" />
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarningIcon sx={{ color: theme.palette.error.main, mr: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Fumador</Typography>
                      <Chip 
                        label={data.match_request_info.smoking_allowed ? "Sí fuma" : "No fuma"}
                        color={data.match_request_info.smoking_allowed ? "warning" : "success"}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      {/* Solo información del estado del Match si existe */}
      {data.match_request_info && (
        <Card sx={{ mb: 3, border: `2px solid ${theme.palette.warning.main}20` }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AssessmentIcon sx={{ color: theme.palette.warning.main, mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Solicitud #{data.match_request_info.match_code}
                </Typography>
              </Box>
              <Chip 
                label={data.match_request_info.status_display}
                color={
                  data.match_request_info.status === 'accepted' ? 'success' :
                  data.match_request_info.status === 'rejected' ? 'error' :
                  data.match_request_info.status === 'pending' ? 'warning' : 'default'
                }
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Decisión Simple de Match */}
      <Card ref={decisionSectionRef} sx={{ mt: 3 }}>
        <CardContent>
          {data.match_request_info ? (
            <>
              {data.match_request_info.status === 'pending' && (
                <>
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <AlertTitle>¿Aprobar este candidato?</AlertTitle>
                    Revisa la información del candidato y decide si aprobar el match. 
                    Si lo apruebas, aparecerá en tu módulo de contratos para continuar el proceso.
                  </Alert>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      startIcon={<ApproveIcon />}
                      onClick={() => handleMatchDecision('accept')}
                      disabled={loading}
                      sx={{ minWidth: 160 }}
                    >
                      ✅ Aprobar Match
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="large"
                      startIcon={<ErrorIcon />}
                      onClick={() => handleMatchDecision('reject')}
                      disabled={loading}
                      sx={{ minWidth: 160 }}
                    >
                      ❌ Rechazar
                    </Button>
                  </Stack>
                </>
              )}
              
              {data.match_request_info.status === 'accepted' && (
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 2,
                    animation: 'pulse 1s ease-in-out',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: '0 0 0 0 rgba(46, 125, 50, 0.4)'
                      },
                      '70%': {
                        boxShadow: '0 0 0 10px rgba(46, 125, 50, 0)'
                      },
                      '100%': {
                        boxShadow: '0 0 0 0 rgba(46, 125, 50, 0)'
                      }
                    }
                  }}
                >
                  <AlertTitle>✅ Candidato Aprobado</AlertTitle>
                  Este candidato ya fue aprobado. Ahora está disponible en tu módulo de contratos para continuar el proceso.
                </Alert>
              )}
              
              {data.match_request_info.status === 'rejected' && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 2,
                    animation: 'pulse 1s ease-in-out',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.4)'
                      },
                      '70%': {
                        boxShadow: '0 0 0 10px rgba(211, 47, 47, 0)'
                      },
                      '100%': {
                        boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)'
                      }
                    }
                  }}
                >
                  <AlertTitle>❌ Candidato Rechazado</AlertTitle>
                  Has rechazado a este candidato. No aparecerá en tu módulo de contratos.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Solo Información</AlertTitle>
              Esta es una vista informativa. Las solicitudes específicas se manejan a través del sistema de matches.
            </Alert>
          )}
          
          {/* Botón cerrar */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            {onClose && (
              <Button
                variant="text"
                onClick={onClose}
                size="large"
              >
                Cerrar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CandidateEvaluationView;