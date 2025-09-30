import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon, 
  People as PeopleIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { useAuth } from '../../hooks/useAuth';
import { contractService } from '../../services/contractService';
import TenantContractsDashboard from './TenantContractsDashboard';

export const ContractList: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { contracts, isLoading, error, deleteContract } = useContracts();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedContract, setSelectedContract] = React.useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contract: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedContract(contract);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContract(null);
  };

  const handleView = () => {
    if (selectedContract) {
      navigate(`/app/contracts/${selectedContract.id}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedContract) {
      navigate(`/app/contracts/${selectedContract.id}/edit`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedContract) {
      try {
        await deleteContract.mutateAsync(selectedContract.id);
        // Opcionalmente mostrar un mensaje de éxito
        console.log('✅ Contrato eliminado exitosamente');
      } catch (error) {
        console.error('Error deleting contract:', error);
        alert('Error al eliminar el contrato. Por favor, intenta de nuevo.');
      }
    }
    handleMenuClose();
  };

  const handleSendForReview = async (contractId: string) => {
    try {
      console.log('Enviar para revisión:', contractId);
      await contractService.sendContractForReview(contractId);
      console.log('✅ Contrato enviado para revisión exitosamente');
      
      // Refrescar la lista de contratos
      window.location.reload();
    } catch (error) {
      console.error('Error sending contract for review:', error);
      alert('Error al enviar el contrato para revisión. Por favor, intenta de nuevo.');
    }
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Alert severity="warning">
        Debes iniciar sesión para ver los contratos.
      </Alert>
    );
  }

  // Control de acceso por roles - Los arrendatarios usan un dashboard específico
  if (user?.user_type === 'tenant') {
    return <TenantContractsDashboard />;
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error al cargar los contratos: {error.message}
      </Alert>
    );
  }

  // Asegurar que contracts sea un array
  const contractsArray = Array.isArray(contracts) ? contracts : [];
  
  // IMPORTANTE: Solo mostrar contratos que están firmados o en ejecución
  // NO mostrar borradores ni contratos en proceso de aprobación
  const finalContracts = contractsArray.filter(contract => {
    const finalStatuses = [
      'fully_signed',           // Completamente Firmado
      'pending_move_in',        // Pendiente Entrega de Llaves
      'active',                 // Activo
      'en_ejecucion',          // En Ejecución
      'expired',               // Vencido
      'terminated',            // Terminado
    ];
    return finalStatuses.includes(contract.status);
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Contratos
        </Typography>
        {/* Solo los landlords pueden crear nuevos contratos y ver candidatos */}
        {user?.user_type === 'landlord' && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<PeopleIcon />}
              onClick={() => navigate('/app/contracts/matched-candidates')}
            >
              Candidatos Aprobados
            </Button>
          </Stack>
        )}
      </Box>

      {finalContracts.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            No tienes contratos activos o finalizados.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Los contratos aparecerán aquí una vez estén completamente firmados y autenticados.
          </Typography>
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        {finalContracts.map((contract) => (
          <Grid item xs={12} sm={6} md={4} key={contract.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" component="div">
                    Contrato #{contract.id?.substring(0, 8) || contract.id}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, contract)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                {/* Información de la propiedad */}
                {contract.property ? (
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      🏠 {contract.property.title || 'Propiedad'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📍 {contract.property.address}
                    </Typography>
                    {contract.property.main_image && (
                      <Box
                        component="img"
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 1,
                          mb: 1
                        }}
                        src={contract.property.main_image}
                        alt={contract.property.title}
                      />
                    )}
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {contract.property.bedrooms && (
                        <Chip size="small" label={`${contract.property.bedrooms} hab`} />
                      )}
                      {contract.property.bathrooms && (
                        <Chip size="small" label={`${contract.property.bathrooms} baños`} />
                      )}
                      {contract.property.area && (
                        <Chip size="small" label={`${contract.property.area} m²`} />
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Propiedad no especificada
                  </Typography>
                )}
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Chip
                    label={
                      contract.status === 'draft' ? 'Borrador' :
                      contract.status === 'ready_for_authentication' ? 'Listo para Autenticación' :
                      contract.status === 'pdf_generated' ? 'PDF Generado' :
                      contract.status === 'pending_authentication' ? 'Pendiente Autenticación' :
                      contract.status === 'authenticated_pending_signature' ? 'Pendiente Firma' :
                      contract.status === 'fully_signed' ? 'Firmado' :
                      contract.status === 'active' ? 'Activo' :
                      contract.status || 'Sin estado'
                    }
                    color={
                      contract.status === 'active' || contract.status === 'fully_signed' ? 'success' :
                      contract.status === 'draft' ? 'default' :
                      contract.status === 'ready_for_authentication' ? 'warning' :
                      contract.status === 'pdf_generated' ? 'info' :
                      contract.status === 'pending_authentication' ? 'warning' :
                      contract.status === 'authenticated_pending_signature' ? 'info' :
                      'default'
                    }
                    size="small"
                  />
                </Box>
                {/* Información del inquilino */}
                {contract.tenant ? (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="primary" gutterBottom>
                      👤 <strong>Inquilino</strong>
                    </Typography>
                    <Typography variant="body2">
                      {contract.tenant.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {contract.tenant.email}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Inquilino:</strong> No especificado
                  </Typography>
                )}
                
                {/* Información del contrato */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Fecha inicio:</strong> {contract.start_date || 'No especificada'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Renta:</strong> ${contract.monthly_rent?.toLocaleString() || contract.property?.rent_price?.toLocaleString() || '0'}
                  </Typography>
                </Box>
              </CardContent>
              {/* Botones de acción según el estado del contrato */}
              {(contract.status === 'draft' || contract.status === 'ready_for_authentication' || contract.status === 'pdf_generated') && (
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  {contract.status === 'draft' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/app/contracts/${contract.id}/edit`)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={() => handleSendForReview(contract.id)}
                      >
                        Enviar
                      </Button>
                    </>
                  )}
                  
                  {contract.status === 'pdf_generated' && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DescriptionIcon />}
                        onClick={() => {
                          // TODO: Ver PDF generado
                          console.log('Ver PDF:', contract.id);
                        }}
                      >
                        Ver PDF
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => {
                          // TODO: Aprobar y continuar
                          console.log('Aprobar PDF:', contract.id);
                        }}
                      >
                        Aprobar
                      </Button>
                    </>
                  )}
                  
                  {contract.status === 'ready_for_authentication' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<SecurityIcon />}
                      fullWidth
                      onClick={() => {
                        // Navegar al nuevo flujo de autenticación biométrica
                        navigate(`/app/contracts/${contract.id}/authenticate`);
                      }}
                    >
🎥 Autenticación Profesional
                    </Button>
                  )}
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {contractsArray.length === 0 && (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" color="text.secondary">
            No hay contratos disponibles
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Crea tu primer contrato haciendo clic en "Nuevo Contrato"
          </Typography>
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>Ver Detalles</MenuItem>
        <MenuItem onClick={handleEdit}>Editar</MenuItem>
        <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
      </Menu>
    </Box>
  );
};