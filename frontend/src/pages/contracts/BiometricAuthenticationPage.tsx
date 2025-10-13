import React, { useState, useEffect } from 'react';
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
      console.log('🔐 Validating turn for user:', user.user_type);

      // Intentar iniciar autenticación para verificar turno
      const response = await api.post(`/contracts/${id}/start-biometric-authentication/`);

      // Si llegamos aquí, el usuario puede proceder
      setTurnValidation({ canProceed: true });

    } catch (error: any) {
      console.log('🚫 Turn validation failed:', error.response?.status, error.response?.data);

      if (error.response?.status === 423) {
        // HTTP 423 Locked = no es su turno
        const data = error.response.data;
        setTurnValidation({
          canProceed: false,
          currentTurn: data.current_turn,
          waitingFor: data.waiting_for,
          message: data.message
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

  // Intentar obtener el contrato desde el workflow
  useEffect(() => {
    const fetchWorkflowContract = async () => {
      if (!id) return;

      try {
        setLoading(true);
        console.log('🔍 BiometricAuth: Buscando contrato del workflow:', id);

        // Intentar obtener desde el endpoint de contratos normales primero
        const response = await api.get(`/contracts/contracts/${id}/`);
        setWorkflowContract(response.data);
        console.log('✅ BiometricAuth: Contrato encontrado:', response.data);

        // Validar turno después de obtener el contrato
        await validateTurn();

      } catch (err) {
        console.error('❌ BiometricAuth: Error al obtener contrato:', err);
        setError('No se pudo cargar el contrato');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowContract();
  }, [id, user]);

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
  const validStatesForAuth = [
    'ready_for_authentication',
    'pending_authentication',
    'pending_tenant_authentication',
    'pending_landlord_authentication',
    'pending_biometric',
    'draft',
    'pending_tenant_review',
    'pdf_generated'
  ];

  if (!validStatesForAuth.includes(contract.status)) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          Este contrato no está listo para autenticación biométrica.
          Estado actual: {contract.status}
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

  const handleComplete = async (data: any) => {
    console.log('🎉 BiometricAuthenticationPage: Autenticación biométrica completada');
    console.log('📦 Data recibida de ProfessionalBiometricFlow:', data);

    try {
      setLoading(true);

      // Llamar al endpoint de completado
      console.log(`🚀 Llamando a POST /contracts/${id}/complete-auth/`);
      const response = await api.post(`/contracts/${id}/complete-auth/`, data);

      console.log('✅ Respuesta del servidor:', response.data);

      // Determinar el tipo de usuario de forma más robusta
      const currentUserId = authContext.user?.id;
      const currentUserType = authContext.user?.user_type;

      console.log('🔍 Determinando tipo de usuario:', {
        currentUserId,
        currentUserType,
        contractTenantId: contract?.tenant?.id,
        contractSecondaryPartyId: contract?.secondary_party?.id,
        contractLandlordId: contract?.landlord?.id,
        contractPrimaryPartyId: contract?.primary_party?.id
      });

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

      console.log(`✅ Tipo de usuario determinado: ${userType}`);

      if (userType === 'tenant') {
        // Tenant completó → Esperar al landlord
        console.log('➡️ Redirigiendo a dashboard de tenant');
        navigate('/app/contracts/tenant', {
          state: {
            message: '✅ Autenticación completada. Esperando autenticación del arrendador.',
            type: 'success'
          }
        });
      } else if (userType === 'landlord') {
        // Landlord completó → Contrato activo
        console.log('🎉 Redirigiendo a dashboard principal - Contrato activo');
        navigate('/app/contracts', {
          state: {
            message: '🎉 ¡Contrato firmado y activo! El contrato ha nacido a la vida jurídica.',
            type: 'success'
          }
        });
      } else {
        // Fallback
        console.warn('⚠️ UserType desconocido, usando fallback');
        navigate('/app/contracts', {
          state: {
            message: 'Autenticación biométrica completada exitosamente',
            type: 'success'
          }
        });
      }

    } catch (error: any) {
      console.error('❌ Error guardando autenticación:', error);
      console.error('❌ Error details:', error.response?.data);
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
            🔐 Autenticación Biométrica Secuencial
          </Typography>
          <Typography variant="body1" paragraph>
            {turnValidation.message}
          </Typography>

          {/* Información pedagógica del flujo */}
          <Box mt={2} p={2} bgcolor="rgba(25, 118, 210, 0.05)" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              📋 Orden de Autenticación:
            </Typography>
            <Box component="ol" pl={2}>
              <Typography component="li" variant="body2" color={turnValidation.currentTurn === 'tenant' ? 'primary' : 'text.secondary'}>
                <strong>1. Arrendatario</strong> {turnValidation.currentTurn === 'tenant' ? '(En proceso...)' : contract.guarantor ? '(Pendiente)' : '(Completado ✅)'}
              </Typography>
              {contract.guarantor && (
                <Typography component="li" variant="body2" color={turnValidation.currentTurn === 'guarantor' ? 'primary' : 'text.secondary'}>
                  <strong>2. Garante/Codeudor</strong> {turnValidation.currentTurn === 'guarantor' ? '(En proceso...)' : turnValidation.currentTurn === 'tenant' ? '(Esperando...)' : '(Completado ✅)'}
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
            {user?.user_type === 'landlord' && turnValidation.currentTurn === 'guarantor' && (
              <Typography variant="body2">
                El garante/codeudor debe completar su verificación biométrica. Una vez que termine,
                recibirás una notificación y podrás continuar con tu autenticación.
              </Typography>
            )}
            {user?.user_type === 'tenant' && turnValidation.currentTurn === 'guarantor' && (
              <Typography variant="body2">
                Has completado tu autenticación exitosamente. Ahora el garante/codeudor debe completar
                su verificación biométrica antes de que el arrendador pueda proceder.
              </Typography>
            )}
            {user?.user_type === 'tenant' && turnValidation.currentTurn === 'landlord' && (
              <Typography variant="body2">
                ✅ ¡Felicitaciones! Has completado tu autenticación biométrica exitosamente.
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
            onClick={() => window.location.reload()}
            color="primary"
          >
            🔄 Actualizar Estado
          </Button>
        </Box>
      </Box>
    );
  }

  // Extraer información del usuario para la verificación de voz
  // Esta información podría venir del perfil del usuario logueado o del contrato
  const userInfo = {
    fullName: contract.tenant?.full_name || '', // Nombre del inquilino
    documentNumber: contract.tenant?.document_number || '', // Número de documento
    documentIssueDate: contract.tenant?.document_issue_date || '' // Fecha de expedición
  };

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