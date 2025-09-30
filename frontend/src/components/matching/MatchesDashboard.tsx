import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Divider,
  Stack,
  Paper,
  Tooltip,
  Fade,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Handshake,
  CheckCircle,
  Schedule,
  Error,
  Cancel,
  Visibility,
  AttachMoney,
  Person,
  Home,
  Email,
  Phone,
  Work,
  Assessment,
  Send,
  Close,
  Message,
  TrendingUp,
  FilterList,
  Refresh,
  Assignment,
  Business,
  Description as DocumentIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import useMatchRequests from '../../hooks/useMatchRequests';
import { MatchRequest, matchingService } from '../../services/matchingService';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import EnhancedTenantDocumentUpload from '../contracts/EnhancedTenantDocumentUpload';

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
      id={`match-tabpanel-${index}`}
      aria-labelledby={`match-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MatchesDashboard: React.FC = () => {
  // console.log('🔥 MatchesDashboard renderizando...');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // console.log('🔥 MatchesDashboard: Llamando useMatchRequests...');
  const {
    sentRequests,
    receivedRequests,
    statistics,
    dashboardData,
    isLoading,
    error,
    markAsViewed,
    acceptRequest,
    rejectRequest,
    getCompatibility,
    refetchMatchRequests,
    getStatusColor,
    getStatusText,
    getPriorityColor,
    getPriorityText,
    formatCurrency,
    isExpired,
    isExpiringSoon,
  } = useMatchRequests();
  
  // console.log('🔥 MatchesDashboard: useMatchRequests completado');
  // console.log('🔥 MatchesDashboard: error =', error);
  // console.log('🔥 MatchesDashboard: statistics =', statistics);
  // console.log('🔥 MatchesDashboard: sentRequests =', sentRequests);
  // console.log('🔥 MatchesDashboard: receivedRequests =', receivedRequests);

  const [tabValue, setTabValue] = useState(0);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [selectedRequestForContract, setSelectedRequestForContract] = useState<MatchRequest | null>(null);
  const [candidateDetailsModalOpen, setCandidateDetailsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchRequest | null>(null);
  
  // Auto-refresh when component receives focus (e.g., returning from visit scheduling)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing match requests');
      refetchMatchRequests();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchMatchRequests]);

  const isLandlord = user?.user_type === 'landlord';
  const isTenant = user?.user_type === 'tenant';

  // 🔥 DEBUG - Ver qué datos llegan
  // Memoize processed data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => ({
    isLandlord,
    isTenant,
    sentRequests: sentRequests || [],
    receivedRequests: receivedRequests || [],
    statistics
  }), [isLandlord, isTenant, sentRequests, receivedRequests, statistics]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log('🔁🔁🔁 TAB CHANGE EVENT FIRED! newValue:', newValue, 'current:', tabValue);
    setTabValue(newValue);
  };



  const handleAcceptRequest = async (requestId: string) => {
    try {
      console.log('✅ Aceptando solicitud:', requestId);
      const result = await matchingService.acceptMatchRequest(requestId);
      console.log('✅ Solicitud aceptada exitosamente:', result);
      
      // Refrescar los datos
      refetchMatchRequests();
      
      alert('¡Solicitud aceptada exitosamente! El proceso de arrendamiento puede continuar.');
    } catch (error) {
      console.error('❌ Error aceptando solicitud:', error);
      alert('Error al aceptar la solicitud. Por favor, intenta de nuevo.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const confirmReject = window.confirm('¿Estás seguro de que quieres rechazar esta solicitud?');
    if (!confirmReject) return;
    
    try {
      console.log('❌ Rechazando solicitud:', requestId);
      const result = await matchingService.rejectMatchRequest(requestId);
      console.log('❌ Solicitud rechazada exitosamente:', result);
      
      // Refrescar los datos
      refetchMatchRequests();
      
      alert('Solicitud rechazada.');
    } catch (error) {
      console.error('❌ Error rechazando solicitud:', error);
      alert('Error al rechazar la solicitud. Por favor, intenta de nuevo.');
    }
  };

  const handleViewCandidateDetails = (request: MatchRequest) => {
    console.log('👀 Viendo detalles del candidato:', request);
    setSelectedCandidate(request);
    setCandidateDetailsModalOpen(true);
  };

  const handleCreateContract = async (request: MatchRequest) => {
    try {
      // First validate the match for contract creation
      const validationResult = await matchingService.validateMatchForContract(request.id);
      
      if (!validationResult.is_valid) {
        const errorMessage = validationResult.errors && Array.isArray(validationResult.errors) 
          ? validationResult.errors.join(', ')
          : 'Error de validación desconocido';
        alert(`No se puede crear el contrato: ${errorMessage}`);
        return;
      }

      setSelectedRequestForContract(request);
      setContractDialogOpen(true);
    } catch (error) {
      console.error('Error validating match for contract:', error);
      alert('Error validando el match para crear contrato');
    }
  };

  const handleConfirmCreateContract = async () => {
    if (!selectedRequestForContract) return;

    setIsCreatingContract(true);
    try {
      const contractData = {
        contract_type: 'ARR_VIV_URB', // Default Colombian residential lease
        additional_data: {
          match_request_id: selectedRequestForContract.id,
          tenant_info: {
            income: selectedRequestForContract.monthly_income,
            employment_type: selectedRequestForContract.employment_type,
            lease_duration: selectedRequestForContract.lease_duration_months,
          }
        }
      };

      const response = await matchingService.createContractFromMatch(
        selectedRequestForContract.id,
        contractData
      );

      console.log('✅ Contrato creado exitosamente:', response.data);
      
      // Close dialog and navigate to contracts
      setContractDialogOpen(false);
      setSelectedRequestForContract(null);
      
      // Navigate to the new contract
      if (response.data.id) {
        navigate(`/app/contracts/${response.data.id}`);
      } else {
        navigate('/app/contracts');
      }

      alert('¡Contrato creado exitosamente! Redirigiendo...');

    } catch (error: any) {
      console.error('❌ Error creando contrato:', error);
      alert(`Error creando contrato: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsCreatingContract(false);
    }
  };

  const renderStatCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    color: string,
    trend?: number
  ) => (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
            {trend && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <TrendingUp fontSize="small" color={trend > 0 ? 'success' : 'error'} />
                <Typography variant="body2" color={trend > 0 ? 'success.main' : 'error.main'}>
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Stack>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderMatchRequestCard = (request: MatchRequest) => {
    const isExpiredRequest = isExpired(request.expires_at);
    const isExpiringSoonRequest = isExpiringSoon(request.expires_at);

    return (
      <Card 
        key={request.id} 
        sx={{ 
          mb: 2, 
          border: ['pending', 'viewed'].includes(request.status) && isLandlord ? '2px solid #2196F3' : '1px solid #e0e0e0',
          opacity: isExpiredRequest ? 0.7 : 1
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {isLandlord ? (
                  `Solicitud de ${request.tenant_name || 'Usuario'}`
                ) : (
                  `Solicitud para: ${request.property_title || 'Propiedad'}`
                )}
              </Typography>
              
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={getStatusText(request.status)}
                  color={getStatusColor(request.status)}
                  size="small"
                />
                <Chip
                  label={getPriorityText(request.priority)}
                  color={getPriorityColor(request.priority)}
                  size="small"
                  variant="outlined"
                />
                {isExpiringSoonRequest && (
                  <Chip
                    label="Expira pronto"
                    color="warning"
                    size="small"
                    icon={<Schedule />}
                  />
                )}
              </Stack>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Match Code: <strong>{request.match_code}</strong>
              </Typography>

              {request.monthly_income && (
                <Typography variant="body2" color="textSecondary">
                  Ingresos: <strong>{formatCurrency(request.monthly_income)}</strong>
                </Typography>
              )}

              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {request.tenant_message && request.tenant_message.length > 100 
                  ? `${request.tenant_message.substring(0, 100)}...`
                  : request.tenant_message || 'Sin mensaje'
                }
              </Typography>
            </Box>

            <Box textAlign="center" sx={{ ml: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>
                <Person />
              </Avatar>
              <Typography variant="caption" color="textSecondary">
                {formatDistanceToNow(new Date(request.created_at), { 
                  addSuffix: true,
                  locale: es 
                })}
              </Typography>
              {request.compatibility_score && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {request.compatibility_score}% match
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={request.compatibility_score} 
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
            </Box>
          </Stack>

          {/* Botones de aceptar/rechazar movidos al modal de detalles */}

          {/* Para arrendador: solo mostrar botón de ver contratos para matches aceptados */}
          {request.status === 'accepted' && isLandlord && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Assignment />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/app/contracts');
                }}
                color="primary"
              >
                Ver Estado del Proceso
              </Button>
            </Stack>
          )}

          {/* Para tenants: mostrar el estado del proceso contractual y de la visita */}
          {request.status === 'accepted' && isTenant && (
            <Box sx={{ mt: 2 }}>
              {/* Estado de Solicitud Aceptada */}
              <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircle color="success" />
                  <Typography variant="body2" color="success.dark" fontWeight={600}>
                    ¡Solicitud Aceptada! 
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Tu solicitud ha sido aprobada por el arrendador.
                </Typography>
              </Box>

              {/* Mostrar información del workflow si existe - MEJORADO */}
              {request.workflow_stage && (
                <Box sx={{ mb: 2 }}>
                  {/* Mini Stepper */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Box
                        key={step}
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: request.workflow_stage >= step ? 'primary.main' : 'grey.300',
                          border: request.workflow_stage === step ? '2px solid' : 'none',
                          borderColor: 'primary.dark'
                        }}
                      />
                    ))}
                    <Typography variant="body2" fontWeight={600} sx={{ ml: 1 }}>
                      Etapa {request.workflow_stage}/5 ({Math.round((request.workflow_stage / 5) * 100)}%)
                    </Typography>
                  </Box>

                  {/* Descripción de la etapa actual */}
                  <Box sx={{ 
                    p: 1.5, 
                    bgcolor: request.workflow_stage === 1 ? 'info.50' :
                             request.workflow_stage === 2 ? 'warning.50' :
                             request.workflow_stage === 3 ? 'primary.50' :
                             request.workflow_stage === 4 ? 'secondary.50' : 'success.50',
                    borderRadius: 1, 
                    border: '1px solid', 
                    borderColor: request.workflow_stage === 1 ? 'info.200' :
                                request.workflow_stage === 2 ? 'warning.200' :
                                request.workflow_stage === 3 ? 'primary.200' :
                                request.workflow_stage === 4 ? 'secondary.200' : 'success.200'
                  }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      {request.workflow_stage === 1 && "🏠 Programación de Visita"}
                      {request.workflow_stage === 2 && "📄 Revisión de Documentos"}
                      {request.workflow_stage === 3 && "📋 Creación del Contrato"}
                      {request.workflow_stage === 4 && "🔐 Autenticación Biométrica"}
                      {request.workflow_stage === 5 && "🔑 Proceso Completado"}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      {request.workflow_stage === 1 && (
                        isTenant ? "El arrendador coordinará la visita a la propiedad contigo." 
                        : "Coordina la visita a la propiedad con el candidato."
                      )}
                      {request.workflow_stage === 2 && (
                        isTenant ? "Debes subir los documentos requeridos para continuar." 
                        : "El candidato está subiendo documentos para revisión."
                      )}
                      {request.workflow_stage === 3 && (
                        isTenant ? "Los documentos fueron aprobados. Se está creando el contrato." 
                        : "Documentos aprobados. Puedes crear el contrato de arrendamiento."
                      )}
                      {request.workflow_stage === 4 && (
                        isTenant ? "Realiza la verificación biométrica para firmar el contrato." 
                        : "El candidato completará la verificación biométrica."
                      )}
                      {request.workflow_stage === 5 && "¡Felicitaciones! Proceso completado exitosamente."}
                    </Typography>

                    {/* Información específica de visita */}
                    {request.workflow_stage === 1 && request.workflow_data?.visit_scheduled && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'white', borderRadius: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>
                          📅 Visita: {new Date(request.workflow_data.visit_scheduled.date).toLocaleDateString('es-CO')} 
                          a las {request.workflow_data.visit_scheduled.time}
                        </Typography>
                        {request.workflow_data.visit_scheduled.completed && (
                          <Typography variant="caption" color="success.main" display="block">
                            ✅ Visita completada
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Acciones específicas por etapa */}
                    {request.workflow_stage === 2 && isTenant && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="warning.dark" fontWeight={600}>
                          ⚡ Acción requerida: Subir documentos
                        </Typography>
                      </Box>
                    )}
                    
                    {request.workflow_stage === 3 && !isTenant && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="primary.dark" fontWeight={600}>
                          ⚡ Puedes crear el contrato desde la sección Contratos
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Mostrar visita programada solo si existe y no está en etapa 2+ (visita completada) */}
                  {request.workflow_data?.visit_scheduled && request.workflow_stage < 2 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        🏠 Visita Programada
                      </Typography>
                      <Typography variant="caption">
                        Fecha: {new Date(request.workflow_data.visit_scheduled.date).toLocaleDateString()} 
                        {' '}a las {request.workflow_data.visit_scheduled.time}
                      </Typography>
                      {request.workflow_data.visit_scheduled.notes && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Notas: {request.workflow_data.visit_scheduled.notes}
                        </Typography>
                      )}
                    </Alert>
                  )}
                  
                  {/* Mostrar confirmación de visita completada en etapa 2+ */}
                  {request.workflow_data?.visit_scheduled?.completed && request.workflow_stage >= 2 && (
                    <Alert severity="success" sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        ✅ Visita Completada
                      </Typography>
                      <Typography variant="caption">
                        La visita a la propiedad ha sido completada exitosamente.
                      </Typography>
                    </Alert>
                  )}

                  {/* Indicador de progreso del workflow */}
                  <LinearProgress 
                    variant="determinate" 
                    value={(request.workflow_stage || 0) * 20} 
                    sx={{ mt: 1, height: 8, borderRadius: 1 }}
                  />
                </Box>
              )}

              {/* Mostrar componente de subida de documentos si está en etapa 2 y es tenant */}
              {isTenant && request.status === 'accepted' && request.workflow_stage === 2 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      📄 Acción Requerida: Subir Documentos
                    </Typography>
                    <Typography variant="caption">
                      Para continuar con el proceso, necesitas subir los documentos requeridos.
                    </Typography>
                  </Alert>
                  <Box data-documents-section>
                    <EnhancedTenantDocumentUpload
                      processId={request.id}
                      onDocumentUploaded={() => {
                        // Refrescar los datos cuando se suba un documento
                        refetchMatchRequests();
                      }}
                      matchRequestData={request}
                      guaranteeType={
                        request.workflow_data?.guarantee_type || 
                        (request.workflow_data?.guarantees?.guarantee_type) ||
                        'none'
                      }
                      codeudorName={
                        request.workflow_data?.guarantees?.codeudor_full_name ||
                        request.workflow_data?.codeudor_full_name ||
                        ''
                      }
                    />
                  </Box>
                </Box>
              )}

              {/* Vista para el arrendador cuando el tenant está subiendo documentos */}
              {!isTenant && request.status === 'accepted' && request.workflow_stage === 2 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      📄 Arrendatario Subiendo Documentos
                    </Typography>
                    <Typography variant="caption">
                      El arrendatario está en proceso de subir los documentos requeridos. Podrás ver el progreso aquí.
                    </Typography>
                  </Alert>
                  {/* Solo mostrar progreso, sin funcionalidad de subida para el arrendador */}
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    ⏳ Esperando documentos del arrendatario...
                  </Typography>
                </Box>
              )}

              {/* Mostrar información de documentos aprobados para arrendatarios en etapa 3 */}
              {isTenant && request.status === 'accepted' && request.workflow_stage === 3 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      ✅ Documentos Aprobados
                    </Typography>
                    <Typography variant="caption">
                      ¡Excelente! Todos tus documentos han sido revisados y aprobados por el arrendador. El proceso ha avanzado a la creación del contrato.
                    </Typography>
                  </Alert>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      📋 Etapa 3: Creación del Contrato
                    </Typography>
                    <Typography variant="caption">
                      El arrendador está creando el borrador del contrato. Te notificaremos cuando esté listo para tu revisión.
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Información adicional para el arrendatario */}
              {!request.workflow_stage || request.workflow_stage < 2 ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  El arrendador está coordinando los siguientes pasos del proceso.
                </Typography>
              ) : null}
            </Box>
          )}
          
          {/* Botones de Aceptar/Rechazar para arrendadores con solicitudes pendientes */}
          {isLandlord && ['pending', 'viewed'].includes(request.status) && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<Visibility />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewCandidateDetails(request);
                  }}
                >
                  Ver Detalles
                </Button>
              </Stack>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircle />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcceptRequest(request.id);
                  }}
                  disabled={isExpiredRequest}
                >
                  Aceptar
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<Close />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRejectRequest(request.id);
                  }}
                  disabled={isExpiredRequest}
                >
                  Rechazar
                </Button>
              </Stack>
              {isExpiredRequest && (
                <Typography variant="caption" color="error" sx={{ mt: 1, textAlign: 'center', display: 'block' }}>
                  Esta solicitud ha expirado
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Error cargando datos de matches: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {isLandlord ? 'Solicitudes Recibidas' : 'Mis Solicitudes'}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {isLandlord 
                ? 'Gestiona las solicitudes de match de tus propiedades'
                : 'Seguimiento de tus solicitudes de match enviadas'
              }
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              console.log('🔄 Manual refresh - refreshing match requests');
              refetchMatchRequests();
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </Stack>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            {renderStatCard(
              isLandlord ? 'Solicitudes Recibidas' : 'Solicitudes Enviadas',
              statistics?.total_received || statistics?.total_sent || 0,
              <Assignment />,
              '#2196F3'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            {renderStatCard(
              'Pendientes',
              statistics?.pending || 0,
              <Schedule />,
              '#FF9800'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            {renderStatCard(
              'Aceptadas',
              statistics?.accepted || 0,
              <CheckCircle />,
              '#4CAF50'
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Simple Button Tabs - Testing */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isLandlord ? (
            <>
              <Button 
                variant={tabValue === 0 ? "contained" : "outlined"}
                onClick={() => {
                  console.log('🔥🔥🔥 BUTTON TAB 0 CLICKED');
                  setTabValue(0);
                }}
              >
                Pendientes
              </Button>
              <Button 
                variant={tabValue === 1 ? "contained" : "outlined"}
                onClick={() => {
                  console.log('🔥🔥🔥 BUTTON TAB 1 CLICKED');
                  setTabValue(1);
                }}
              >
                Aceptadas
              </Button>
              <Button 
                variant={tabValue === 2 ? "contained" : "outlined"}
                onClick={() => {
                  console.log('🔥🔥🔥 BUTTON TAB 2 CLICKED');
                  setTabValue(2);
                }}
              >
                Rechazadas
              </Button>
              <Button 
                variant={tabValue === 3 ? "contained" : "outlined"}
                onClick={() => {
                  console.log('🔥🔥🔥 BUTTON TAB 3 CLICKED');
                  setTabValue(3);
                }}
              >
                Canceladas
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant={tabValue === 0 ? "contained" : "outlined"}
                onClick={() => {
                  console.log('🔥🔥🔥 BUTTON TAB 0 CLICKED');
                  setTabValue(0);
                }}
              >
                Enviadas
              </Button>
              <Button 
                variant={tabValue === 1 ? "contained" : "outlined"}
                onClick={() => {
                  console.log('🔥🔥🔥 BUTTON TAB 1 CLICKED');
                  setTabValue(1);
                }}
              >
                En Proceso
              </Button>
              <Button 
                variant={tabValue === 2 ? "contained" : "outlined"}
                onClick={() => {
                  console.log('🔥🔥🔥 BUTTON TAB 2 CLICKED');
                  setTabValue(2);
                }}
              >
                Completadas
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {isLandlord ? 'Solicitudes Pendientes de Respuesta' : 'Todas las Solicitudes Enviadas'}
          </Typography>
          {isLandlord ? (
            <>
              {receivedRequests.filter(r => ['pending', 'viewed'].includes(r.status)).map(request => renderMatchRequestCard(request))}
              {receivedRequests.filter(r => ['pending', 'viewed'].includes(r.status)).length === 0 && (
                <Alert severity="info" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No hay solicitudes pendientes de respuesta</Typography>
                  <Typography variant="body2">
                    Las solicitudes de arrendatarios que requieran tu decisión (aceptar/rechazar) aparecerán aquí.
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <>
              {sentRequests.map(request => renderMatchRequestCard(request))}
              {sentRequests.length === 0 && (
                <Alert severity="info" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No has enviado solicitudes aún</Typography>
                  <Typography variant="body2">
                    Cuando encuentres una propiedad que te guste, puedes enviar una solicitud al arrendador.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {isLandlord ? 'Solicitudes Aceptadas' : 'Solicitudes en Proceso'}
          </Typography>
          {isLandlord ? (
            <>
              {receivedRequests.filter(r => r.status === 'accepted').map(request => renderMatchRequestCard(request))}
              {receivedRequests.filter(r => r.status === 'accepted').length === 0 && (
                <Alert severity="success" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No hay solicitudes aceptadas</Typography>
                  <Typography variant="body2">
                    Las solicitudes que aceptes aparecerán aquí. Podrás generar contratos desde esta sección.
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <>
              {sentRequests.filter(r => ['viewed', 'pending'].includes(r.status)).map(request => renderMatchRequestCard(request))}
              {sentRequests.filter(r => ['viewed', 'pending'].includes(r.status)).length === 0 && (
                <Alert severity="warning" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No hay solicitudes en proceso</Typography>
                  <Typography variant="body2">
                    Las solicitudes que hayas enviado y estén siendo revisadas aparecerán aquí.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {isLandlord ? 'Solicitudes Rechazadas' : 'Solicitudes Completadas'}
          </Typography>
          {isLandlord ? (
            <>
              {receivedRequests.filter(r => r.status === 'rejected').map(request => renderMatchRequestCard(request))}
              {receivedRequests.filter(r => r.status === 'rejected').length === 0 && (
                <Alert severity="error" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No hay solicitudes rechazadas</Typography>
                  <Typography variant="body2">
                    Las solicitudes que rechaces aparecerán aquí como registro histórico.
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <>
              {sentRequests.filter(r => ['accepted', 'rejected'].includes(r.status)).map(request => renderMatchRequestCard(request))}
              {sentRequests.filter(r => ['accepted', 'rejected'].includes(r.status)).length === 0 && (
                <Alert severity="info" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No hay solicitudes completadas</Typography>
                  <Typography variant="body2">
                    Las solicitudes que hayan sido aceptadas o rechazadas aparecerán aquí.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Solicitudes Canceladas
          </Typography>
          {isLandlord ? (
            <>
              {receivedRequests.filter(r => r.status === 'cancelled').map(request => renderMatchRequestCard(request))}
              {receivedRequests.filter(r => r.status === 'cancelled').length === 0 && (
                <Alert severity="warning" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No hay solicitudes canceladas</Typography>
                  <Typography variant="body2">
                    Las solicitudes que los arrendatarios cancelen aparecerán aquí como registro.
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <>
              {sentRequests.filter(r => r.status === 'cancelled').map(request => renderMatchRequestCard(request))}
              {sentRequests.filter(r => r.status === 'cancelled').length === 0 && (
                <Alert severity="warning" sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>No tienes solicitudes canceladas</Typography>
                  <Typography variant="body2">
                    Las solicitudes que canceles aparecerán aquí como registro histórico.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Box>
      </TabPanel>

      {/* Contract Creation Confirmation Dialog */}
      <Dialog 
        open={contractDialogOpen} 
        onClose={() => setContractDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Crear Contrato de Arrendamiento
            </Typography>
            <IconButton onClick={() => setContractDialogOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          {selectedRequestForContract && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Vas a crear un contrato de arrendamiento basado en la solicitud de match aceptada.
              </Alert>

              <Typography variant="subtitle1" gutterBottom>
                Detalles del Contrato:
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon><Person /></ListItemIcon>
                  <ListItemText 
                    primary="Arrendatario" 
                    secondary={
                      typeof selectedRequestForContract.tenant === 'object'
                        ? selectedRequestForContract.tenant.name || selectedRequestForContract.tenant_name
                        : selectedRequestForContract.tenant || selectedRequestForContract.tenant_name
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Home /></ListItemIcon>
                  <ListItemText 
                    primary="Propiedad" 
                    secondary={
                      typeof selectedRequestForContract.property === 'object'
                        ? selectedRequestForContract.property.title || selectedRequestForContract.property_title
                        : selectedRequestForContract.property || selectedRequestForContract.property_title
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AttachMoney /></ListItemIcon>
                  <ListItemText 
                    primary="Ingresos del Arrendatario" 
                    secondary={formatCurrency(selectedRequestForContract.monthly_income)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Assignment /></ListItemIcon>
                  <ListItemText 
                    primary="Duración del Contrato" 
                    secondary={`${selectedRequestForContract.lease_duration_months} meses`}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="textSecondary">
                El contrato se creará en estado "Borrador" y podrá ser editado antes de enviarlo para firma digital.
                Ambas partes deberán completar el proceso de verificación biométrica antes de la firma final.
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setContractDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmCreateContract}
            disabled={isCreatingContract}
            startIcon={isCreatingContract ? <CircularProgress size={16} /> : <Assignment />}
            color="success"
          >
            {isCreatingContract ? 'Creando Contrato...' : 'Crear Contrato'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Candidate Details Modal */}
      <Dialog 
        open={candidateDetailsModalOpen} 
        onClose={() => setCandidateDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Person color="primary" />
            <Box>
              <Typography variant="h6">
                Detalles del Candidato
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedCandidate?.tenant_name}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedCandidate && (
            <Box>
              {/* Información Personal */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Información Personal
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nombre Completo"
                      value={selectedCandidate.tenant_name || 'No disponible'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email"
                      value={selectedCandidate.tenant_email || 'No disponible'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Teléfono"
                      value={selectedCandidate.tenant_phone || 'No disponible'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Fecha de Mudanza Preferida"
                      value={selectedCandidate.preferred_move_in_date 
                        ? new Date(selectedCandidate.preferred_move_in_date).toLocaleDateString('es-CO')
                        : 'No especificada'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Información Financiera */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney /> Información Financiera y Laboral
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Ingresos Mensuales"
                      value={selectedCandidate.monthly_income 
                        ? formatCurrency(selectedCandidate.monthly_income)
                        : 'No especificado'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Tipo de Empleo"
                      value={selectedCandidate.employment_type || 'No especificado'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Duración del Contrato Solicitada"
                      value={`${selectedCandidate.lease_duration_months || 'No especificada'} meses`}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Información del Hogar */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home /> Información del Hogar
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Número de Ocupantes"
                      value={selectedCandidate.number_of_occupants || 'No especificado'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Mascotas"
                      value={selectedCandidate.has_pets ? 'Sí' : 'No'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Fumador"
                      value={selectedCandidate.smoking_allowed ? 'Sí' : 'No'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  {selectedCandidate.has_pets && selectedCandidate.pet_details && (
                    <Grid item xs={12}>
                      <TextField
                        label="Detalles de Mascotas"
                        value={selectedCandidate.pet_details}
                        fullWidth
                        multiline
                        rows={2}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>

              {/* Referencias y Documentos */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment /> Referencias y Documentos
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip 
                    label="Referencias de Arrendamiento" 
                    color={selectedCandidate.has_rental_references ? "success" : "default"}
                    icon={selectedCandidate.has_rental_references ? <CheckCircle /> : <Cancel />}
                  />
                  <Chip 
                    label="Prueba de Empleo" 
                    color={selectedCandidate.has_employment_proof ? "success" : "default"}
                    icon={selectedCandidate.has_employment_proof ? <CheckCircle /> : <Cancel />}
                  />
                  <Chip 
                    label="Verificación Crediticia" 
                    color={selectedCandidate.has_credit_check ? "success" : "default"}
                    icon={selectedCandidate.has_credit_check ? <CheckCircle /> : <Cancel />}
                  />
                </Stack>
              </Box>

              {/* Mensaje del Candidato */}
              {selectedCandidate.tenant_message && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Message /> Mensaje del Candidato
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                      {selectedCandidate.tenant_message}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Estado del Proceso y Workflow */}
              {selectedCandidate.status === 'accepted' && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assignment /> Estado del Proceso
                  </Typography>
                  
                  {/* Indicador de Etapa Actual */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Etapa actual: {selectedCandidate.workflow_stage || 1} de 5</strong>
                    </Typography>
                    
                    {/* Stepper Visual */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      {[1, 2, 3, 4, 5].map((step) => (
                        <React.Fragment key={step}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              bgcolor: (selectedCandidate.workflow_stage || 1) >= step ? 'primary.main' : 'grey.300',
                              color: (selectedCandidate.workflow_stage || 1) >= step ? 'white' : 'grey.600',
                              border: (selectedCandidate.workflow_stage || 1) === step ? '3px solid' : 'none',
                              borderColor: 'primary.light'
                            }}
                          >
                            {step}
                          </Box>
                          {step < 5 && (
                            <Box
                              sx={{
                                flex: 1,
                                height: 4,
                                bgcolor: (selectedCandidate.workflow_stage || 1) > step ? 'primary.main' : 'grey.300',
                                borderRadius: 2
                              }}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </Box>

                    {/* Descripción de la etapa actual */}
                    <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="body2" fontWeight={600} color="primary.dark">
                        {(selectedCandidate.workflow_stage || 1) === 1 && "🏠 Etapa 1: Programación de Visita"}
                        {(selectedCandidate.workflow_stage || 1) === 2 && "📄 Etapa 2: Revisión de Documentos"}
                        {(selectedCandidate.workflow_stage || 1) === 3 && "📋 Etapa 3: Creación del Contrato"}
                        {(selectedCandidate.workflow_stage || 1) === 4 && "🔐 Etapa 4: Autenticación Biométrica"}
                        {(selectedCandidate.workflow_stage || 1) === 5 && "🔑 Etapa 5: Entrega de Llaves"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {(selectedCandidate.workflow_stage || 1) === 1 && "Se coordinará la visita a la propiedad con el candidato seleccionado."}
                        {(selectedCandidate.workflow_stage || 1) === 2 && "El candidato debe subir los documentos requeridos para verificación."}
                        {(selectedCandidate.workflow_stage || 1) === 3 && "Se está preparando el contrato de arrendamiento basado en los términos acordados."}
                        {(selectedCandidate.workflow_stage || 1) === 4 && "Verificación biométrica y firma digital del contrato."}
                        {(selectedCandidate.workflow_stage || 1) === 5 && "Proceso completado. Entrega de llaves y ejecución del contrato."}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Información de Visita Programada */}
                  {selectedCandidate.workflow_data?.visit_scheduled && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" fontWeight={600} gutterBottom>
                        📅 Visita Programada
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Fecha"
                            value={selectedCandidate.workflow_data.visit_scheduled.date
                              ? new Date(selectedCandidate.workflow_data.visit_scheduled.date).toLocaleDateString('es-CO')
                              : 'No programada'}
                            fullWidth
                            InputProps={{ readOnly: true }}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Hora"
                            value={selectedCandidate.workflow_data.visit_scheduled.time || 'No especificada'}
                            fullWidth
                            InputProps={{ readOnly: true }}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Estado"
                            value={selectedCandidate.workflow_data.visit_scheduled.completed ? 'Completada' : 'Pendiente'}
                            fullWidth
                            InputProps={{ 
                              readOnly: true,
                              style: {
                                color: selectedCandidate.workflow_data.visit_scheduled.completed ? 'green' : 'orange'
                              }
                            }}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                        {selectedCandidate.workflow_data.visit_scheduled.notes && (
                          <Grid item xs={12}>
                            <TextField
                              label="Notas de la Visita"
                              value={selectedCandidate.workflow_data.visit_scheduled.notes}
                              fullWidth
                              multiline
                              rows={2}
                              InputProps={{ readOnly: true }}
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  )}

                  {/* Barra de progreso general */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Progreso General: {Math.round(((selectedCandidate.workflow_stage || 1) / 5) * 100)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={((selectedCandidate.workflow_stage || 1) / 5) * 100} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Box>
              )}

              {/* Score de Compatibilidad */}
              {selectedCandidate.compatibility_score && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp /> Compatibilidad
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h4" color="primary">
                      {selectedCandidate.compatibility_score}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedCandidate.compatibility_score} 
                      sx={{ flex: 1, height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setCandidateDetailsModalOpen(false)}>
            Cerrar
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<Close />}
            onClick={() => {
              setCandidateDetailsModalOpen(false);
              if (selectedCandidate) {
                handleRejectRequest(selectedCandidate.id);
              }
            }}
          >
            Rechazar
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<CheckCircle />}
            onClick={() => {
              setCandidateDetailsModalOpen(false);
              if (selectedCandidate) {
                handleAcceptRequest(selectedCandidate.id);
              }
            }}
          >
            Aceptar Candidato
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MatchesDashboard;