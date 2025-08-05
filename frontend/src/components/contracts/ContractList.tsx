import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { MoreVert as MoreVertIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { useAuth } from '../../hooks/useAuth';

export const ContractList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
        await deleteContract(selectedContract.id);
      } catch (error) {
        console.error('Error deleting contract:', error);
      }
    }
    handleMenuClose();
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Contratos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/contracts/new')}
        >
          Nuevo Contrato
        </Button>
      </Box>

      <Grid container spacing={3}>
        {contractsArray.map((contract) => (
          <Grid item xs={12} sm={6} md={4} key={contract.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" component="div">
                    Contrato #{contract.id}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, contract)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {contract.property?.title || 'Propiedad no especificada'}
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Chip
                    label={contract.status || 'Sin estado'}
                    color={
                      contract.status === 'active' ? 'success' :
                      contract.status === 'pending' ? 'warning' :
                      contract.status === 'completed' ? 'info' : 'default'
                    }
                    size="small"
                  />
                </Box>
                <Typography variant="body2">
                  <strong>Inquilino:</strong> {contract.tenant?.name || 'No especificado'}
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha inicio:</strong> {contract.start_date || 'No especificada'}
                </Typography>
                <Typography variant="body2">
                  <strong>Renta:</strong> ${contract.monthly_rent || 0}
                </Typography>
              </CardContent>
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