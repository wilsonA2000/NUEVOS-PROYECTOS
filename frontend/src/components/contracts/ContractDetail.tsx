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
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';

export const ContractDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { contracts, isLoading, error } = useContracts();

  const contract = contracts?.find((c) => c.id === id);

  if (isLoading) {
    return <Typography>Cargando...</Typography>;
  }

  if (error || !contract) {
    return <Typography color="error">Error al cargar el contrato</Typography>;
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
                  secondary={contract.propertyId}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Inquilino"
                  secondary={contract.tenantId}
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
                  secondary={new Date(contract.startDate).toLocaleDateString()}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Fecha de Fin"
                  secondary={new Date(contract.endDate).toLocaleDateString()}
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
                  secondary={`$${contract.rentAmount.toLocaleString()}`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AttachMoneyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Monto de Depósito"
                  secondary={`$${contract.depositAmount.toLocaleString()}`}
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