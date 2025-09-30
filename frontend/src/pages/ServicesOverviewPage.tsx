import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Chip,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fade,
  Grow
} from '@mui/material';
import { 
  Gavel,
  AccountBalance,
  Business,
  Build,
  Security,
  AttachMoney,
  Assessment,
  LocalShipping,
  Apartment,
  Verified,
  Star,
  TrendingUp,
  Phone,
  Email,
  Schedule,
  Close,
  CheckCircle
} from '@mui/icons-material';
import axios from 'axios';

// Mapa de iconos
const iconMap: { [key: string]: React.ReactElement } = {
  Gavel: <Gavel />,
  AccountBalance: <AccountBalance />,
  Business: <Business />,
  Build: <Build />,
  Security: <Security />,
  AttachMoney: <AttachMoney />,
  Assessment: <Assessment />,
  LocalShipping: <LocalShipping />,
  Apartment: <Apartment />,
  Verified: <Verified />
};

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  color: string;
  is_featured: boolean;
  services_count: number;
}

interface Service {
  id: string;
  name: string;
  short_description: string;
  full_description: string;
  category_name: string;
  category_color: string;
  pricing_type: string;
  price_display: string;
  difficulty: string;
  estimated_duration: string;
  popularity_score: number;
  is_featured: boolean;
  is_most_requested: boolean;
  views_count: number;
  requests_count: number;
  contact_email?: string;
  contact_phone?: string;
  provider_info?: string;
  requirements?: string;
}

interface ServiceRequestData {
  service: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  message: string;
  preferred_date?: string;
  budget_range?: string;
}

const ServicesOverviewPage: React.FC = () => {
  const theme = useTheme();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [mostRequestedServices, setMostRequestedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [requestFormData, setRequestFormData] = useState<ServiceRequestData>({
    service: '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    message: '',
    preferred_date: '',
    budget_range: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, featuredRes, mostRequestedRes] = await Promise.all([
        axios.get('/api/v1/services/categories/'),
        axios.get('/api/v1/services/services/featured/'),
        axios.get('/api/v1/services/services/most_requested/')
      ]);

      setCategories(categoriesRes.data);
      setFeaturedServices(featuredRes.data);
      setMostRequestedServices(mostRequestedRes.data);
    } catch (error) {
      console.error('Error loading services data:', error);
      setError('Error al cargar los servicios. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const loadServicesByCategory = async (categorySlug: string) => {
    try {
      const response = await axios.get(`/api/v1/services/services/by_category/?category=${categorySlug}`);
      setServices(response.data);
      setSelectedCategory(categorySlug);
    } catch (error) {
      console.error('Error loading services by category:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setSelectedCategory(null);
    setServices([]);
  };

  const handleServiceRequest = (service: Service) => {
    setSelectedService(service);
    setRequestFormData({
      ...requestFormData,
      service: service.id
    });
    setRequestDialogOpen(true);
  };

  const handleRequestSubmit = async () => {
    if (!selectedService) return;

    try {
      setSubmittingRequest(true);
      await axios.post('/api/v1/services/requests/', requestFormData);
      setRequestSuccess(true);
      
      setTimeout(() => {
        setRequestDialogOpen(false);
        setRequestSuccess(false);
        setRequestFormData({
          service: '',
          requester_name: '',
          requester_email: '',
          requester_phone: '',
          message: '',
          preferred_date: '',
          budget_range: ''
        });
      }, 2000);
    } catch (error) {
      console.error('Error submitting service request:', error);
      setError('Error al enviar la solicitud. Por favor, intenta de nuevo.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const ServiceCard = ({ service }: { service: Service }) => (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(service.category_color, 0.15)}`,
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {service.is_featured && (
              <Chip 
                label="Destacado" 
                size="small" 
                icon={<Star />}
                sx={{ 
                  bgcolor: theme.palette.warning.light,
                  color: theme.palette.warning.contrastText,
                  fontWeight: 600
                }} 
              />
            )}
            {service.is_most_requested && (
              <Chip 
                label="Más Solicitado" 
                size="small" 
                icon={<TrendingUp />}
                sx={{ 
                  bgcolor: theme.palette.error.light,
                  color: theme.palette.error.contrastText,
                  fontWeight: 600
                }} 
              />
            )}
          </Box>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            {service.price_display}
          </Typography>
        </Box>
        
        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
          {service.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          {service.short_description}
        </Typography>

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip 
            label={service.category_name} 
            size="small" 
            sx={{ 
              bgcolor: alpha(service.category_color, 0.1),
              color: service.category_color
            }} 
          />
          <Chip 
            label={service.estimated_duration} 
            size="small" 
            variant="outlined"
            icon={<Schedule />}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="caption" color="text.secondary">
            {service.views_count} vistas • {service.requests_count} solicitudes
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: service.difficulty === 'easy' ? 'success.main' : 
                     service.difficulty === 'medium' ? 'warning.main' : 
                     service.difficulty === 'hard' ? 'error.main' : 'info.main',
              fontWeight: 600
            }}
          >
            {service.difficulty === 'easy' ? 'Fácil' :
             service.difficulty === 'medium' ? 'Medio' :
             service.difficulty === 'hard' ? 'Difícil' : 'Experto'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          onClick={() => handleServiceRequest(service)}
          sx={{
            mt: 'auto',
            bgcolor: service.category_color,
            '&:hover': {
              bgcolor: alpha(service.category_color, 0.8),
            }
          }}
        >
          Solicitar Servicio
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
          pt: 8,
          pb: 8,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Fade in timeout={1000}>
            <Box textAlign="center">
              <Typography 
                variant="h2" 
                component="h1" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 3
                }}
              >
                Servicios Adicionales VeriHome
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: 800, 
                  mx: 'auto',
                  lineHeight: 1.6,
                  fontWeight: 400
                }}
              >
                Conectamos con los mejores profesionales y servicios especializados 
                para todas tus necesidades inmobiliarias y legales.
              </Typography>
            </Box>
          </Fade>
        </Container>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Tabs Navigation */}
        <Paper sx={{ mb: 4 }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            <Tab label="Servicios Destacados" />
            <Tab label="Más Solicitados" />
            <Tab label="Por Categorías" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {selectedTab === 0 && (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
                Servicios Destacados
              </Typography>
              <Grid container spacing={3}>
                {featuredServices.map((service) => (
                  <Grid item xs={12} sm={6} lg={4} key={service.id}>
                    <ServiceCard service={service} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grow>
        )}

        {selectedTab === 1 && (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
                Servicios Más Solicitados
              </Typography>
              <Grid container spacing={3}>
                {mostRequestedServices.map((service) => (
                  <Grid item xs={12} sm={6} lg={4} key={service.id}>
                    <ServiceCard service={service} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grow>
        )}

        {selectedTab === 2 && (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
                Servicios por Categorías
              </Typography>
              
              {/* Categories Grid */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {categories.map((category) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
                    <Card
                      onClick={() => loadServicesByCategory(category.name.toLowerCase().replace(/\s+/g, '-'))}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: selectedCategory === category.name.toLowerCase().replace(/\s+/g, '-') ? 2 : 1,
                        borderColor: selectedCategory === category.name.toLowerCase().replace(/\s+/g, '-') 
                          ? category.color 
                          : 'divider',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 16px ${alpha(category.color, 0.2)}`,
                        }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(category.color, 0.1),
                            color: category.color,
                            width: 60,
                            height: 60,
                            mx: 'auto',
                            mb: 2
                          }}
                        >
                          {iconMap[category.icon_name] || <Build />}
                        </Avatar>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          {category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {category.description}
                        </Typography>
                        <Chip 
                          label={`${category.services_count} servicios`}
                          size="small"
                          sx={{
                            bgcolor: alpha(category.color, 0.1),
                            color: category.color
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Services by Category */}
              {services.length > 0 && (
                <Box>
                  <Divider sx={{ my: 4 }} />
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    Servicios Disponibles
                  </Typography>
                  <Grid container spacing={3}>
                    {services.map((service) => (
                      <Grid item xs={12} sm={6} lg={4} key={service.id}>
                        <ServiceCard service={service} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          </Grow>
        )}
      </Container>

      {/* Request Service Dialog */}
      <Dialog 
        open={requestDialogOpen} 
        onClose={() => setRequestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Solicitar Servicio: {selectedService?.name}
            <IconButton onClick={() => setRequestDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        {requestSuccess ? (
          <DialogContent>
            <Box textAlign="center" py={4}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                ¡Solicitud Enviada Exitosamente!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nos pondremos en contacto contigo pronto.
              </Typography>
            </Box>
          </DialogContent>
        ) : (
          <>
            <DialogContent>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Nombre Completo"
                  value={requestFormData.requester_name}
                  onChange={(e) => setRequestFormData({...requestFormData, requester_name: e.target.value})}
                  required
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={requestFormData.requester_email}
                  onChange={(e) => setRequestFormData({...requestFormData, requester_email: e.target.value})}
                  required
                />
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={requestFormData.requester_phone}
                  onChange={(e) => setRequestFormData({...requestFormData, requester_phone: e.target.value})}
                  required
                />
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Describe tu necesidad"
                  value={requestFormData.message}
                  onChange={(e) => setRequestFormData({...requestFormData, message: e.target.value})}
                  required
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha Preferida"
                  value={requestFormData.preferred_date}
                  onChange={(e) => setRequestFormData({...requestFormData, preferred_date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Presupuesto Estimado (opcional)"
                  value={requestFormData.budget_range}
                  onChange={(e) => setRequestFormData({...requestFormData, budget_range: e.target.value})}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setRequestDialogOpen(false)} disabled={submittingRequest}>
                Cancelar
              </Button>
              <Button 
                variant="contained" 
                onClick={handleRequestSubmit}
                disabled={submittingRequest || !requestFormData.requester_name || !requestFormData.requester_email || !requestFormData.message}
              >
                {submittingRequest ? <CircularProgress size={20} /> : 'Enviar Solicitud'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ServicesOverviewPage;