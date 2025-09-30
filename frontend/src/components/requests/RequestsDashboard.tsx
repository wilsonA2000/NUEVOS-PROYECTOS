import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  IconButton,
  Divider,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Paper,
  Fade,
  Slide,
  Zoom,
  Grow,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Schedule,
  Error,
  Cancel,
  Add,
  FilterList,
  Refresh,
  Home,
  Build,
  Description,
  Handshake,
  Person,
  Visibility,
  Work,
  Email,
  Phone,
  Business,
  School,
  AttachMoney,
  Close,
  Assessment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import requestService, { BaseRequest, PropertyInterestRequest } from '../../services/requestService';
import { useAuth } from '../../hooks/useAuth';
import CandidateEvaluationView from './CandidateEvaluationView';
import MatchesDashboard from '../matching/MatchesDashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`request-tabpanel-${index}`}
      aria-labelledby={`request-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const RequestsDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<BaseRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<BaseRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<BaseRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<BaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [mainTabValue, setMainTabValue] = useState(0); // 0: Match Requests, 1: Service Requests
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  // Estados para la nueva vista unificada
  const [candidateId, setCandidateId] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [matchRequestId, setMatchRequestId] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, allRequestsResponse, sentResponse, receivedResponse, rejectedResponse] = await Promise.all([
        requestService.getDashboardStats(),
        requestService.getMyRequests(),
        requestService.getMySentRequests(),
        requestService.getMyReceivedRequests(),
        requestService.getMyRejectedRequests()
      ]);

      setStats(statsResponse.data);
      
      // Obtener los datos originales
      const allRequests = allRequestsResponse.data.results || allRequestsResponse.data;
      const sentRequestsData = sentResponse.data.results || sentResponse.data;
      const receivedRequestsData = receivedResponse.data.results || receivedResponse.data;
      const rejectedRequestsData = rejectedResponse.data.results || rejectedResponse.data;
      
      // Filtrar solicitudes: excluir rechazadas de otras pestañas
      const nonRejectedSent = sentRequestsData.filter((req: BaseRequest) => req.status !== 'rejected');
      const nonRejectedReceived = receivedRequestsData.filter((req: BaseRequest) => req.status !== 'rejected');
      
      // Configurar estados
      setRequests(allRequests); // Mantener todas en la pestaña "Todas" 
      setSentRequests(nonRejectedSent);
      setReceivedRequests(nonRejectedReceived);
      
      // Para rechazadas, buscar en todas las fuentes
      const allRejected = [
        ...allRequests.filter((req: BaseRequest) => req.status === 'rejected'),
        ...sentRequestsData.filter((req: BaseRequest) => req.status === 'rejected'),
        ...receivedRequestsData.filter((req: BaseRequest) => req.status === 'rejected')
      ];
      
      // Eliminar duplicados por ID
      const uniqueRejected = Array.from(
        new Map(allRejected.map(item => [item.id, item])).values()
      );
      
      setRejectedRequests(uniqueRejected);
    } catch (error) {
      console.error('Error loading requests data:', error);
      setError('Error al cargar las solicitudes. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMainTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMainTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    return requestService.getStatusColor(status);
  };

  const getStatusText = (status: string) => {
    return requestService.getStatusText(status);
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'property_interest':
        return <Home />;
      case 'service_request':
        return <Build />;
      case 'contract_signature':
        return <Description />;
      case 'maintenance_request':
        return <Build />;
      default:
        return <Assignment />;
    }
  };

  const handleRequestAction = async (requestId: string, action: string, message?: string, request?: BaseRequest) => {
    try {
      await requestService.performRequestAction(requestId, { action, message });
      
      // Si es una solicitud de interés en propiedad y se acepta, navegar al flujo de candidatos
      if (action === 'accept' && request && request.request_type === 'property_interest') {
        console.log('✅ Solicitud aceptada - Redirigiendo al flujo de candidatos aprobados');
        // Redirigir al flujo correcto de 3 etapas en lugar de crear contrato directamente
        navigate('/app/contracts/matched-candidates');
      } else {
        // Para otras acciones, solo recargar los datos
        await loadData();
      }
    } catch (error) {
      console.error('Error performing action:', error);
      setError('Error al realizar la acción. Por favor, intenta de nuevo.');
    }
  };

  const handleViewProfile = async (userId: string, userType: string) => {
    // NUEVA FUNCIÓN UNIFICADA: Usar evaluación completa en lugar de perfil separado
    handleViewCandidateEvaluation(userId);
  };

  const handleViewResume = async (userId: string, userType: string) => {
    // NUEVA FUNCIÓN UNIFICADA: Usar evaluación completa en lugar de resume separado
    handleViewCandidateEvaluation(userId);
  };

  // Nueva función para evaluación unificada de candidatos
  const handleViewCandidateEvaluation = async (userId: string, propId?: string, requestId?: string) => {
    try {
      // Configurar los IDs para la nueva vista
      setCandidateId(userId);
      setPropertyId(propId || '');
      
      console.log('🔍 Debug - handleViewCandidateEvaluation:', { userId, propId, requestId });
      
      // SOLUCIÓN DIRECTA: Usar requestId como matchRequestId
      if (requestId) {
        console.log('✅ Debug - Usando requestId como matchRequestId:', requestId);
        setMatchRequestId(requestId);
      } else {
        console.log('❌ Debug - No requestId disponible');
        setMatchRequestId('');
      }
      
      setProfileModalOpen(true);
    } catch (error) {
      console.error('Error loading candidate evaluation:', error);
      setError('Error al cargar la evaluación del candidato.');
    }
  };

  const theme = useTheme();

  const getGradientByIndex = (index: number) => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    ];
    return gradients[index % gradients.length];
  };

  const StatCard = ({ title, value, icon, color, index }: { title: string; value: number; icon: React.ReactNode; color: string; index: number }) => (
    <Grow in timeout={600 + (index * 200)}>
      <Card
        sx={{
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid',
          borderColor: 'grey.200',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            borderColor: 'primary.main'
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: getGradientByIndex(index),
            zIndex: 1
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography
                color="text.secondary"
                gutterBottom
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                {title}
              </Typography>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  background: getGradientByIndex(index),
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {value}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                background: getGradientByIndex(index),
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Box sx={{ color: 'white', fontSize: '2rem' }}>
                {icon}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  const RequestCard = ({ request, showActions = true }: { request: BaseRequest; showActions?: boolean }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
    <Grow in timeout={800}>
      <Card
        sx={{
          mb: 3,
          borderRadius: 4,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid',
          borderColor: isHovered ? 'primary.main' : 'grey.200',
          boxShadow: isHovered
            ? '0 16px 32px rgba(0, 0, 0, 0.12)'
            : '0 4px 16px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
            >
              <Box sx={{ color: 'white', fontSize: '1.5rem' }}>
                {getRequestTypeIcon(request.request_type)}
              </Box>
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: 'text.primary'
              }}
            >
              {request.title}
            </Typography>
          </Box>
          <Chip
            label={getStatusText(request.status)}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette[getStatusColor(request.status)]?.main || '#666'}, ${alpha(theme.palette[getStatusColor(request.status)]?.main || '#666', 0.8)})`,
              color: 'white',
              fontWeight: 600,
              borderRadius: 2,
              height: 32,
              '& .MuiChip-label': {
                px: 2
              }
            }}
          />
        </Box>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          {request.description}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {request.requester.full_name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {request.requester.full_name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {request.requester.user_type === 'landlord' ? 'Arrendador' : 
                 request.requester.user_type === 'tenant' ? 'Arrendatario' : 'Prestador de Servicios'}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="textSecondary">
              {requestService.formatDateTime(request.created_at)}
            </Typography>
          </Box>
        </Box>

        {/* Información adicional para solicitudes de interés en propiedad */}
        {request.request_type === 'property_interest' && (
          <Box mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Detalles de la Solicitud:</strong>
            </Typography>
            {(request as PropertyInterestRequest).monthly_income && (
              <Typography variant="caption" display="block">
                • Ingresos mensuales: ${(request as PropertyInterestRequest).monthly_income?.toLocaleString()} COP
              </Typography>
            )}
            {(request as PropertyInterestRequest).employment_type && (
              <Typography variant="caption" display="block">
                • Tipo de empleo: {(request as PropertyInterestRequest).employment_type}
              </Typography>
            )}
            <Typography variant="caption" display="block">
              • Ocupantes: {(request as PropertyInterestRequest).number_of_occupants}
            </Typography>
            <Typography variant="caption" display="block">
              • Duración deseada: {(request as PropertyInterestRequest).lease_duration_months} meses
            </Typography>
            {(request as PropertyInterestRequest).has_pets && (
              <Typography variant="caption" display="block" color="warning.main">
                • Tiene mascotas
              </Typography>
            )}
          </Box>
        )}

        {/* Botones de perfil y hoja de vida */}
        {request.requester.user_type === 'tenant' && request.assignee?.id === user?.id && (
          <Box display="flex" gap={1} mb={2}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<Assessment />}
              onClick={() => {
                console.log('🔍 Debug - Request object:', request);
                console.log('🔍 Debug - Property info:', request.property);
                handleViewCandidateEvaluation(request.requester.id, request.property?.id, request.id);
              }}
              sx={{ flex: 1 }}
            >
              Evaluar Candidato
            </Button>
          </Box>
        )}

        {showActions && request.assignee?.id === user?.id && request.status === 'pending' && (
          <Box display="flex" gap={1} pt={1}>
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => handleRequestAction(request.id, 'accept', undefined, request)}
            >
              Aceptar
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleRequestAction(request.id, 'reject', undefined, request)}
            >
              Rechazar
            </Button>
          </Box>
        )}

        {showActions && request.assignee?.id === user?.id && request.status === 'in_progress' && (
          <Box display="flex" gap={1} pt={1}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => handleRequestAction(request.id, 'complete', undefined, request)}
            >
              Completar
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
    </Grow>
  );
  };

  if (loading) {
    return (
      <Box>
        <LinearProgress />
        <Box p={3}>
          <Typography>Cargando solicitudes...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Modern Header */}
      <Fade in timeout={600}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            p: 4,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 16px 32px rgba(102, 126, 234, 0.3)'
          }}
        >
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(45deg, #ffffff, #f0f8ff)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              🏠 Gestión de Solicitudes
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                opacity: 0.9,
                fontWeight: 400
              }}
            >
              Administra todas las solicitudes de propiedades y servicios
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  background: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Filtros
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadData}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  background: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{
                background: 'linear-gradient(45deg, #43e97b, #38f9d7)',
                color: 'white',
                fontWeight: 600,
                boxShadow: '0 8px 24px rgba(67, 233, 123, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #38f9d7, #43e97b)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(67, 233, 123, 0.5)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Nueva Solicitud
            </Button>
          </Box>
        </Box>
      </Fade>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}


      {/* Modern Main Tabs */}
      <Slide in timeout={800} direction="up">
        <Paper
          sx={{
            mb: 4,
            borderRadius: 4,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden'
          }}
        >
          <Tabs
            value={mainTabValue}
            onChange={handleMainTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                py: 3,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 80,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.05)'
                },
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                  color: 'primary.main'
                }
              },
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: 2,
                background: 'linear-gradient(45deg, #667eea, #764ba2)'
              }
            }}
          >
            <Tab
              label="🤝 Solicitudes de Match"
              icon={<Handshake sx={{ fontSize: '2rem', mb: 1 }} />}
              iconPosition="top"
            />
            <Tab
              label="🔧 Solicitudes de Servicio"
              icon={<Build sx={{ fontSize: '2rem', mb: 1 }} />}
              iconPosition="top"
            />
          </Tabs>
        </Paper>
      </Slide>

      {/* Render Match Dashboard or Service Requests based on selected tab */}
      {mainTabValue === 0 ? (
        <MatchesDashboard />
      ) : (
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="request tabs">
            <Tab label={`Todas (${requests.length})`} />
            <Tab label={`Enviadas (${sentRequests.length})`} />
            <Tab label={`Recibidas (${receivedRequests.length})`} />
            <Tab label={`Rechazadas (${rejectedRequests.length})`} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {requests.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No tienes solicitudes
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Las solicitudes aparecerán aquí cuando las crees o recibas
              </Typography>
            </Box>
          ) : (
            requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {sentRequests.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No has enviado solicitudes
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Puedes crear nuevas solicitudes usando el botón "Nueva Solicitud"
              </Typography>
            </Box>
          ) : (
            sentRequests.map((request) => (
              <RequestCard key={request.id} request={request} showActions={false} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {receivedRequests.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No has recibido solicitudes
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Las solicitudes que otros usuarios te envíen aparecerán aquí
              </Typography>
            </Box>
          ) : (
            receivedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {rejectedRequests.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Cancel sx={{ fontSize: 64, color: 'error.light', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No tienes solicitudes rechazadas
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Las solicitudes que hayas rechazado o que hayan sido rechazadas aparecerán aquí
              </Typography>
            </Box>
          ) : (
            rejectedRequests.map((request) => (
              <RequestCard key={request.id} request={request} showActions={false} />
            ))
          )}
        </TabPanel>
        </Card>
      )}

      {/* Modal de Evaluación Unificada de Candidato */}
      <Dialog
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            height: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogContent sx={{ p: 0, height: '100%' }}>
          {candidateId && (
            <CandidateEvaluationView
              candidateId={candidateId}
              propertyId={propertyId || undefined}
              matchRequestId={matchRequestId || undefined}
              onClose={() => setProfileModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Hoja de Vida Detallada */}
      <Dialog
        open={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Work color="primary" />
              <Typography variant="h5">
                Hoja de Vida Profesional
              </Typography>
            </Box>
            <IconButton onClick={() => setResumeModalOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedResume ? (
            <Box>
              {/* Header con información básica y score */}
              <Box mb={4} p={3} bgcolor="primary.light" borderRadius={2} color="primary.contrastText">
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h4" gutterBottom>
                      {selectedResume.user_info?.full_name || 'Usuario'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                      {selectedResume.user_info?.email}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                      {selectedResume.user_info?.phone}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} textAlign="right">
                    <Box bgcolor="background.paper" p={2} borderRadius={2} color="text.primary">
                      <Typography variant="h6" color="primary">
                        Puntuación de Verificación
                      </Typography>
                      <Typography variant="h3" color={
                        selectedResume.verification?.verification_score >= 80 ? 'success.main' :
                        selectedResume.verification?.verification_score >= 60 ? 'warning.main' : 'error.main'
                      }>
                        {selectedResume.verification?.verification_score || 0}%
                      </Typography>
                      <Typography variant="caption">
                        {selectedResume.verification?.is_complete ? '✅ Completo' : '⚠️ Incompleto'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Grid container spacing={3}>
                {/* Información Personal */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                        <Person /> Información Personal
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Fecha de Nacimiento" 
                            secondary={selectedResume.personal_info?.date_of_birth || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Nacionalidad" 
                            secondary={selectedResume.personal_info?.nationality || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Estado Civil" 
                            secondary={selectedResume.personal_info?.marital_status || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Dependientes" 
                            secondary={selectedResume.personal_info?.dependents || 0} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Información Educativa */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                        <School /> Información Educativa
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Nivel Educativo" 
                            secondary={selectedResume.education?.level_display || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Institución" 
                            secondary={selectedResume.education?.institution_name || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Campo de Estudio" 
                            secondary={selectedResume.education?.field_of_study || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Año de Graduación" 
                            secondary={selectedResume.education?.graduation_year || 'No especificado'} 
                          />
                        </ListItem>
                        {selectedResume.education?.gpa && (
                          <ListItem>
                            <ListItemText 
                              primary="Promedio (GPA)" 
                              secondary={`${selectedResume.education.gpa}/4.0`} 
                            />
                          </ListItem>
                        )}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Información Laboral */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                        <Business /> Información Laboral Detallada
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <List dense>
                            <ListItem>
                              <ListItemText 
                                primary="Empleador Actual" 
                                secondary={selectedResume.employment?.current_employer || 'No especificado'} 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="Cargo Actual" 
                                secondary={selectedResume.employment?.current_position || 'No especificado'} 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="Tipo de Empleo" 
                                secondary={selectedResume.employment?.employment_type_display || 'No especificado'} 
                              />
                            </ListItem>
                          </List>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <List dense>
                            <ListItem>
                              <ListItemText 
                                primary="Fecha de Inicio" 
                                secondary={selectedResume.employment?.start_date ? new Date(selectedResume.employment.start_date).toLocaleDateString() : 'No especificado'} 
                              />
                            </ListItem>
                            {selectedResume.employment?.end_date && (
                              <ListItem>
                                <ListItemText 
                                  primary="Fecha de Fin" 
                                  secondary={new Date(selectedResume.employment.end_date).toLocaleDateString()} 
                                />
                              </ListItem>
                            )}
                            <ListItem>
                              <ListItemText 
                                primary="Salario Mensual" 
                                secondary={selectedResume.employment?.monthly_salary ? 
                                  `$${selectedResume.employment.monthly_salary.toLocaleString()} COP` : 
                                  'No especificado'} 
                              />
                            </ListItem>
                          </List>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <List dense>
                            <ListItem>
                              <ListItemText 
                                primary="Supervisor" 
                                secondary={selectedResume.employment?.supervisor_name || 'No especificado'} 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="Teléfono Supervisor" 
                                secondary={selectedResume.employment?.supervisor_phone || 'No especificado'} 
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="Email Supervisor" 
                                secondary={selectedResume.employment?.supervisor_email || 'No especificado'} 
                              />
                            </ListItem>
                          </List>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Información Financiera */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                        <AttachMoney /> Información Financiera
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Gastos Mensuales" 
                            secondary={selectedResume.financial?.monthly_expenses ? 
                              `$${selectedResume.financial.monthly_expenses.toLocaleString()} COP` : 
                              'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Puntuación Crediticia" 
                            secondary={selectedResume.financial?.credit_score || 'No disponible'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Banco Principal" 
                            secondary={selectedResume.financial?.bank_name || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Tipo de Cuenta" 
                            secondary={selectedResume.financial?.account_type || 'No especificado'} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Contacto de Emergencia */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                        <Phone /> Contacto de Emergencia
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Nombre" 
                            secondary={selectedResume.emergency_contact?.name || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Teléfono" 
                            secondary={selectedResume.emergency_contact?.phone || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Relación" 
                            secondary={selectedResume.emergency_contact?.relation || 'No especificado'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Dirección" 
                            secondary={selectedResume.emergency_contact?.address || 'No especificado'} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Referencias Personales */}
                {selectedResume.references && selectedResume.references.length > 0 && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                          <Handshake /> Referencias Personales
                        </Typography>
                        <Grid container spacing={2}>
                          {selectedResume.references.map((ref: any, index: number) => (
                            <Grid item xs={12} md={6} key={index}>
                              <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                                <CardContent>
                                  <Typography variant="subtitle1" gutterBottom>
                                    👤 Referencia {index + 1}
                                  </Typography>
                                  <Typography variant="body2">
                                    <strong>Nombre:</strong> {ref.name}
                                  </Typography>
                                  <Typography variant="body2">
                                    <strong>Teléfono:</strong> {ref.phone}
                                  </Typography>
                                  <Typography variant="body2">
                                    <strong>Email:</strong> {ref.email || 'No disponible'}
                                  </Typography>
                                  <Typography variant="body2">
                                    <strong>Relación:</strong> {ref.relation || 'No especificado'}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Estado de Documentos de Verificación */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                        <Description /> Estado de Documentos de Verificación
                      </Typography>
                      <Grid container spacing={2}>
                        {Object.entries(selectedResume.document_verification || {}).map(([docType, docInfo]: [string, any]) => (
                          <Grid item xs={12} sm={6} md={4} key={docType}>
                            <Box p={2} border={1} borderColor="grey.300" borderRadius={1}>
                              <Typography variant="subtitle2" gutterBottom>
                                {docType === 'id_document' ? '🆔 Documento de Identidad' :
                                 docType === 'proof_of_income' ? '💰 Comprobante de Ingresos' :
                                 docType === 'bank_statement' ? '🏦 Estado de Cuenta' :
                                 docType === 'employment_letter' ? '💼 Carta Laboral' :
                                 docType === 'tax_return' ? '📊 Declaración de Impuestos' :
                                 docType === 'credit_report' ? '📈 Reporte Crediticio' : docType}
                              </Typography>
                              <Chip 
                                label={
                                  docInfo.status === 'verified' ? 'Verificado' :
                                  docInfo.status === 'pending' ? 'Pendiente' :
                                  docInfo.status === 'rejected' ? 'Rechazado' : 'Sin subir'
                                }
                                color={
                                  docInfo.status === 'verified' ? 'success' :
                                  docInfo.status === 'pending' ? 'warning' :
                                  docInfo.status === 'rejected' ? 'error' : 'default'
                                }
                                size="small"
                              />
                              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                {docInfo.has_file ? '📎 Archivo subido' : '❌ Sin archivo'}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Información Adicional */}
                {(selectedResume.additional_info?.criminal_record || selectedResume.housing_history) && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary" display="flex" alignItems="center" gap={1}>
                          <Visibility /> Información Adicional
                        </Typography>
                        
                        {/* Antecedentes */}
                        <Box mb={2}>
                          <Typography variant="subtitle1" gutterBottom>
                            Antecedentes Penales:
                          </Typography>
                          <Chip 
                            label={selectedResume.additional_info?.criminal_record ? 'Sí tiene antecedentes' : 'Sin antecedentes'}
                            color={selectedResume.additional_info?.criminal_record ? 'error' : 'success'}
                          />
                          {selectedResume.additional_info?.criminal_record_details && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Detalles:</strong> {selectedResume.additional_info.criminal_record_details}
                            </Typography>
                          )}
                        </Box>

                        {/* Historial de Vivienda */}
                        {selectedResume.housing_history && (
                          <Box>
                            <Typography variant="subtitle1" gutterBottom>
                              Historial de Vivienda:
                            </Typography>
                            <Typography variant="body2">
                              <strong>Historial de desalojos:</strong> {selectedResume.housing_history.eviction_history ? 'Sí' : 'No'}
                            </Typography>
                            {selectedResume.housing_history.eviction_details && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Detalles:</strong> {selectedResume.housing_history.eviction_details}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Metadatos */}
                <Grid item xs={12}>
                  <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="caption" color="textSecondary">
                      Hoja de vida creada el: {selectedResume.metadata?.created_at ? new Date(selectedResume.metadata.created_at).toLocaleDateString() : 'No disponible'}
                      {selectedResume.metadata?.updated_at && (
                        <span> | Última actualización: {new Date(selectedResume.metadata.updated_at).toLocaleDateString()}</span>
                      )}
                      {selectedResume.verification?.verified_at && (
                        <span> | Verificado el: {new Date(selectedResume.verification.verified_at).toLocaleDateString()}</span>
                      )}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Cargando hoja de vida completa...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResumeModalOpen(false)} variant="outlined">
            Cerrar
          </Button>
          {selectedResume?.verification?.verification_score && (
            <Chip 
              label={`Confiabilidad: ${selectedResume.verification.verification_score}%`}
              color={
                selectedResume.verification.verification_score >= 80 ? 'success' :
                selectedResume.verification.verification_score >= 60 ? 'warning' : 'error'
              }
            />
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestsDashboard;