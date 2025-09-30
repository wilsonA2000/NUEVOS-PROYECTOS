import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { viewContractPDF } from '../../utils/contractPdfUtils';

export const ContractDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { contracts, isLoading, error } = useContracts();

  // Debug: Log contracts data structure
  console.log('🔍 ContractDetail - contracts:', contracts, 'type:', typeof contracts, 'isArray:', Array.isArray(contracts));
  console.log('🔍 ContractDetail - looking for id:', id);

  const contract = Array.isArray(contracts) ? contracts.find((c) => c.id === id) : undefined;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Error al cargar el contrato</AlertTitle>
        {error.message || 'Ha ocurrido un error al cargar los detalles del contrato.'}
      </Alert>
    );
  }

  if (!contract) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <AlertTitle>Contrato no encontrado</AlertTitle>
        El contrato con ID {id?.substring(0, 8)}... no fue encontrado. 
        <Box mt={2}>
          <Button variant="contained" onClick={() => navigate('/app/contracts')}>
            Volver a Contratos
          </Button>
        </Box>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h5" component="div">
            Contrato #{contract.id}
          </Typography>
          <Chip
            label={contract.status}
            color={
              contract.status === 'active'
                ? 'success'
                : contract.status === 'expired'
                ? 'error'
                : 'warning'
            }
          />
        </Box>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={4}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Propiedad"
                  secondary={contract.property?.title || contract.property?.address || contract.propertyId || 'No especificada'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Inquilino"
                  secondary={contract.tenant?.name || contract.tenant?.full_name || contract.tenantId || 'No especificado'}
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CalendarIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Fecha de Inicio"
                  secondary={contract.startDate ? new Date(contract.startDate).toLocaleDateString() : contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'No especificada'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Fecha de Fin"
                  secondary={contract.endDate ? new Date(contract.endDate).toLocaleDateString() : contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'No especificada'}
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <AttachMoneyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Monto de Renta"
                  secondary={`$${contract.rentAmount?.toLocaleString() || '0'}`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AttachMoneyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Monto de Depósito"
                  secondary={`$${contract.depositAmount?.toLocaleString() || '0'}`}
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Términos
        </Typography>
        <Typography variant="body1" paragraph>
          {contract.terms}
        </Typography>

        {contract.documents.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Documentos
            </Typography>
            <List>
              {contract.documents.map((document, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText primary={document} />
                </ListItem>
              ))}
            </List>
          </>
        )}

        <Box display="flex" gap={2} mt={3}>
          <Button
            variant="outlined"
            onClick={() => navigate('/app/contracts')}
          >
            Volver
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PdfIcon />}
            onClick={() => viewContractPDF(contract.id)}
          >
            Ver PDF del Contrato
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/app/contracts/${contract.id}/edit`)}
          >
            Editar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}; 