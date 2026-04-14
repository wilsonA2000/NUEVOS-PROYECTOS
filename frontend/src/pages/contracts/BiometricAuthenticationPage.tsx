import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Alert, Button, CircularProgress, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ProfessionalBiometricFlow from '../../components/contracts/ProfessionalBiometricFlow';
import WaitingForOtherUser from '../../components/contracts/WaitingForOtherUser';
import { useContracts } from '../../hooks/useContracts';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const BiometricAuthenticationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useAuth();
  const { user } = authContext;
  const { contracts } = useContracts();
  const [workflowContract, setWorkflowContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turnValidation, setTurnValidation] = useState<{
    canProceed: boolean;
    currentTurn?: 'tenant' | 'landlord';
    waitingFor?: string;
    message?: string;
  }>({ canProceed: true });

  // Función para validar si es el turno del usuario
  const validateTurn = async () => {
    if (!id || !user) return;

    try {

      // Intentar iniciar autenticación para verificar turno
      const response = await api.post(`/contracts/${id}/start-biometric-authentication/`);

      // Si llegamos aquí, el usuario puede proceder
      setTurnValidation({ canProceed: true });

    } catch (error: any) {

      if (error.response?.status === 423) {
        // HTTP 423 Locked = no es su turno
        const data = error.response.data;
        setTurnValidation({
          canProceed: false,
          currentTurn: data.current_turn,
          waitingFor: data.waiting_for,
          message: data.message,
        });
      } else if (error.response?.status === 409) {
        // HTTP 409 Conflict = ya completado
        setError('La autenticación biométrica ya fue completada por ambas partes.');
      } else {
        // Otros errores
        setError(error.response?.data?.error || 'Error al validar el turno');
      }
    }
  };

  // Función para obtener el contrato y validar turno
  const fetchWorkflowContract = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Intentar obtener desde el endpoint de contratos normales primero
      const response = await api.get(`/contracts/contracts/${id}/`);
      setWorkflowContract(response.data);

      // Validar turno después de obtener el contrato
      await validateTurn();

    } catch (err) {
      setError('No se pudo cargar el contrato');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  // Intentar obtener el contrato desde el workflow
  useEffect(() => {
    fetchWorkflowContract();
  }, [fetchWorkflowContract]);

  // Usar el contrato del workflow si está disponible, sino el de la lista normal
  const contract = workflowContract || contracts?.find((c: any) => c.id === id);

  if (loading) {
    return (
      <Box p={3} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/contracts')}
          sx={{ mt: 2 }}
        >
          Volver a Contratos
        </Button>
      </Box>
    );
  }

  if (!contract) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Contrato no encontrado. Por favor, verifica el ID del contrato.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/contracts')}
          sx={{ mt: 2 }}
        >
          Volver a Contratos
        </Button>
      </Box>
    );
  }

  // Verificar si el contrato está en un estado válido para autenticación biométrica
  // BUG-E2E-02: incluir estados del flujo secuencial (tenant->guarantor->landlord)
  // para que la UI no redirija silenciosamente cuando el backend ya está en
  // pending_*_biometric.
  const validStatesForAuth = [
    'ready_for_authentication',
    'pending_authentication',
    'pending_tenant_authentication',
    'pending_landlord_authentication',
    'pending_biometric',
    'draft',
    'pending_tenant_review',
    'pdf_generated',
    // Flujo secuencial backend:
    'pending_tenant_biometric',
    'pending_guarantor_biometric',
    'pending_landlord_biometric',
  ];

  if (!validStatesForAuth.includes(contract.status)) {
    // LOG-E2E-01: Alert informativo en vez de redirección silenciosa.
    // Muestra estado actual + próxima acción esperada, y loguea a consola
    // para diagnóstico (y Sentry si está activo).
    // eslint-disable-next-line no-console
    console.warn(
      `[BiometricAuthPage] Contrato ${contract.id} en estado no válido para firma: "${contract.status}". ` +
        `Estados válidos: ${validStatesForAuth.join(', ')}`,
    );

    const suggestedActionByState: Record<string, string> = {
      active: 'Este contrato ya está activo. No requiere más firmas.',
      expired: 'Este contrato ha expirado. No se puede firmar.',
      cancelled: 'Este contrato fue cancelado. No se puede firmar.',
      terminated: 'Este contrato fue terminado. No se puede firmar.',
      PUBLISHED: 'Este contrato ya nació a la vida jurídica (firmas completas).',
      all_biometrics_completed:
        'Todas las firmas biométricas ya fueron completadas.',
    };
    const suggestion =
      suggestedActionByState[contract.status] ||
      'Es posible que otro actor deba completar un paso antes. Intenta de nuevo más tarde o contacta soporte.';

    return (
      <Box p={3} maxWidth="md" mx="auto">
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Contrato no listo para firma biométrica
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Estado actual:</strong> <code>{contract.status}</code>
          </Typography>
          <Typography variant="body2" paragraph>
            {suggestion}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Estados válidos para este flujo: {validStatesForAuth.join(', ')}
          </Typography>
        </Alert>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/app/contracts')}
          >
            Volver a Contratos
          </Button>
          <Button variant="contained" onClick={() => fetchWorkflowContract()}>
            🔄 Actualizar Estado
          </Button>
        </Box>
      </Box>
    );
  }

  const handleComplete = async (data: any) => {

    try {
      setLoading(true);

      // Llamar al endpoint de completado
      const response = await api.post(`/contracts/${id}/complete-auth/`, data);


      // Determinar el tipo de usuario de forma más robusta
      const currentUserId = authContext.user?.id;
      const currentUserType = authContext.user?.user_type;


      // Determinar userType por múltiples métodos
      let userType = 'unknown';

      if (currentUserType === 'tenant' ||
          currentUserId === contract?.tenant?.id ||
          currentUserId === contract?.secondary_party?.id) {
        userType = 'tenant';
      } else if (currentUserType === 'landlord' ||
                 currentUserId === contract?.landlord?.id ||
                 currentUserId === contract?.primary_party?.id) {
        userType = 'landlord';
      }


      if (userType === 'tenant') {
        // Tenant completó → Esperar al landlord
        navigate('/app/contracts/tenant', {
          state: {
            message: 'Autenticación completada. Esperando autenticación del arrendador.',
            type: 'success',
          },
        });
      } else if (userType === 'landlord') {
        // Landlord completó → Contrato activo
        navigate('/app/contracts', {
          state: {
            message: '¡Contrato firmado y activo! El contrato ha nacido a la vida jurídica.',
            type: 'success',
          },
        });
      } else {
        // Fallback
        navigate('/app/contracts', {
          state: {
            message: 'Autenticación biométrica completada exitosamente',
            type: 'success',
          },
        });
      }

    } catch (error: any) {
      setError(`Error: ${error.response?.data?.error || 'No se pudo completar la autenticación'}`);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/app/contracts');
  };

  // Si no es el turno del usuario, mostrar página de espera pedagógica
  if (!turnValidation.canProceed) {
    return (
      <Box p={3} maxWidth="md" mx="auto">
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Autenticación Biométrica Secuencial
          </Typography>
          <Typography variant="body1" paragraph>
            {turnValidation.message}
          </Typography>

          {/* Información pedagógica del flujo */}
          <Box mt={2} p={2} bgcolor="rgba(25, 118, 210, 0.05)" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Orden de Autenticación:
            </Typography>
            <Box component="ol" pl={2}>
              <Typography component="li" variant="body2" color={turnValidation.currentTurn === 'tenant' ? 'primary' : 'text.secondary'}>
                <strong>1. Arrendatario</strong> {turnValidation.currentTurn === 'tenant' ? '(En proceso...)' : contract.guarantor ? '(Pendiente)' : '(Completado)'}
              </Typography>
              {contract.guarantor && (
                <Typography component="li" variant="body2" color={(turnValidation.currentTurn as string) === 'guarantor' ? 'primary' : 'text.secondary'}>
                  <strong>2. Garante/Codeudor</strong> {(turnValidation.currentTurn as string) === 'guarantor' ? '(En proceso...)' : turnValidation.currentTurn === 'tenant' ? '(Esperando...)' : '(Completado)'}
                </Typography>
              )}
              <Typography component="li" variant="body2" color={turnValidation.currentTurn === 'landlord' ? 'primary' : 'text.secondary'}>
                <strong>{contract.guarantor ? '3' : '2'}. Arrendador</strong> {turnValidation.currentTurn === 'landlord' ? '(En proceso...)' : '(Esperando...)'}
              </Typography>
            </Box>
          </Box>

          {/* Mensaje específico por tipo de usuario */}
          <Box mt={2} p={2} bgcolor="rgba(255, 193, 7, 0.1)" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom color="warning.main">
              💡 ¿Qué sigue?
            </Typography>
            {user?.user_type === 'landlord' && turnValidation.currentTurn === 'tenant' && (
              <Typography variant="body2">
                El arrendatario debe completar su verificación biométrica primero. Una vez que termine,
                recibirás una notificación y podrás continuar con tu autenticación.
              </Typography>
            )}
            {user?.user_type === 'landlord' && (turnValidation.currentTurn as string) === 'guarantor' && (
              <Typography variant="body2">
                El garante/codeudor debe completar su verificación biométrica. Una vez que termine,
                recibirás una notificación y podrás continuar con tu autenticación.
              </Typography>
            )}
            {user?.user_type === 'tenant' && (turnValidation.currentTurn as string) === 'guarantor' && (
              <Typography variant="body2">
                Has completado tu autenticación exitosamente. Ahora el garante/codeudor debe completar
                su verificación biométrica antes de que el arrendador pueda proceder.
              </Typography>
            )}
            {user?.user_type === 'tenant' && turnValidation.currentTurn === 'landlord' && (
              <Typography variant="body2">
                ¡Felicitaciones! Has completado tu autenticación biométrica exitosamente.
                Ahora el arrendador debe completar su verificación biométrica para activar el contrato.
                Te notificaremos cuando el proceso esté completo.
              </Typography>
            )}
          </Box>
        </Alert>

        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
          >
            Volver al Dashboard
          </Button>
          <Button
            variant="contained"
            onClick={() => fetchWorkflowContract()}
            color="primary"
          >
            🔄 Actualizar Estado
          </Button>
        </Box>
      </Box>
    );
  }

  // BUG-001 FIX: Detect the current user's role and pass the correct user's data
  // Previously, this always passed tenant data regardless of who was authenticating
  const currentUserId = user?.id;

  const isTenant =
    currentUserId === contract.tenant?.id ||
    currentUserId === contract.secondary_party?.id;

  const isLandlord =
    currentUserId === contract.landlord?.id ||
    currentUserId === contract.primary_party?.id;

  let userInfo;
  if (isTenant) {
    userInfo = {
      fullName: contract.tenant?.full_name || contract.secondary_party?.full_name || '',
      documentNumber: contract.tenant?.document_number || contract.secondary_party?.document_number || '',
      documentIssueDate: contract.tenant?.document_issue_date || contract.secondary_party?.document_issue_date || '',
    };
  } else if (isLandlord) {
    userInfo = {
      fullName: contract.landlord?.full_name || contract.primary_party?.full_name || '',
      documentNumber: contract.landlord?.document_number || contract.primary_party?.document_number || '',
      documentIssueDate: contract.landlord?.document_issue_date || contract.primary_party?.document_issue_date || '',
    };
  } else {
    // Fallback: use the current user's own data from authContext
    userInfo = {
      fullName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      documentNumber: (user as any)?.document_number || '',
      documentIssueDate: undefined,
    };
  }

  return (
    <ProfessionalBiometricFlow
      contractId={id || ''}
      onComplete={handleComplete}
      onCancel={handleCancel}
      userInfo={userInfo}
    />
  );
};

export default BiometricAuthenticationPage;