import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Skeleton,
  Alert,
  Tab,
  Tabs,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  color: string;
  is_featured: boolean;
}

interface Service {
  id: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  pricing_type: 'fixed' | 'hourly' | 'consultation' | 'quote';
  base_price: string | null;
  price_range_min: string | null;
  price_range_max: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  estimated_duration: string;
  requirements: string;
  popularity_score: number;
  views_count: number;
  requests_count: number;
  is_featured: boolean;
  is_most_requested: boolean;
  contact_email: string;
  contact_phone: string;
}

interface ServiceRequest {
  service: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  message: string;
  preferred_date?: string;
  budget_range?: string;
}

const ServicesMarketplace: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showError } = useSnackbar();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Request form
  const [requestForm, setRequestForm] = useState<ServiceRequest>({
    service: '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    message: '',
    preferred_date: '',
    budget_range: '',
  });
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterServices();
  }, [
    services,
    searchQuery,
    selectedCategory,
    priceFilter,
    difficultyFilter,
    tabValue,
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, servicesRes] = await Promise.all([
        api.get('/services/categories/'),
        api.get('/services/'),
      ]);

      setCategories(categoriesRes.data.results || categoriesRes.data);
      setServices(servicesRes.data.results || servicesRes.data);
      setError(null);
    } catch (err: any) {
      setError('Error al cargar servicios. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = [...services];

    // Tab filter
    if (tabValue === 1) {
      filtered = filtered.filter(s => s.is_featured);
    } else if (tabValue === 2) {
      filtered = filtered.filter(s => s.is_most_requested);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.short_description.toLowerCase().includes(query) ||
          s.full_description.toLowerCase().includes(query),
      );
    }

    // Category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category.slug === selectedCategory);
    }

    // Price
    if (priceFilter !== 'all') {
      filtered = filtered.filter(s => s.pricing_type === priceFilter);
    }

    // Difficulty
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(s => s.difficulty === difficultyFilter);
    }

    setFilteredServices(filtered);
  };

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setDetailDialogOpen(true);
  };

  const handleRequestService = (service: Service) => {
    setSelectedService(service);
    setRequestForm({
      ...requestForm,
      service: service.id,
    });
    setRequestDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    try {
      setRequestLoading(true);
      await api.post('/services/service-requests/', requestForm);
      setRequestSuccess(true);
      setTimeout(() => {
        setRequestDialogOpen(false);
        setRequestSuccess(false);
        setRequestForm({
          service: '',
          requester_name: '',
          requester_email: '',
          requester_phone: '',
          message: '',
          preferred_date: '',
          budget_range: '',
        });
      }, 2000);
    } catch (err: any) {
      showError('Error al enviar solicitud. Intenta nuevamente.');
    } finally {
      setRequestLoading(false);
    }
  };

  const toggleFavorite = (serviceId: string) => {
    setFavorites(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const getPriceDisplay = (service: Service): string => {
    if (service.pricing_type === 'fixed' && service.base_price) {
      return `$${parseFloat(service.base_price).toLocaleString('es-CO')} COP`;
    } else if (service.pricing_type === 'hourly' && service.base_price) {
      return `$${parseFloat(service.base_price).toLocaleString('es-CO')} COP/hora`;
    } else if (service.price_range_min && service.price_range_max) {
      return `$${parseFloat(service.price_range_min).toLocaleString('es-CO')} - $${parseFloat(
        service.price_range_max,
      ).toLocaleString('es-CO')} COP`;
    } else if (service.pricing_type === 'consultation') {
      return 'Consulta disponible';
    } else {
      return 'Precio bajo cotización';
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'info';
      case 'hard':
        return 'warning';
      case 'expert':
        return 'error';
      default:
        return 'default';
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Medio';
      case 'hard':
        return 'Difícil';
      case 'expert':
        return 'Experto';
      default:
        return difficulty;
    }
  };

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <Grid item xs={12} sm={6} md={4} key={n}>
              <Skeleton variant='rectangular' height={300} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Alert severity='error'>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant='h3' gutterBottom fontWeight='bold'>
          Servicios Adicionales
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          Encuentra servicios profesionales para tu propiedad
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label='Todos' />
        <Tab
          label='Destacados'
          icon={<StarIcon fontSize='small' />}
          iconPosition='start'
        />
        <Tab
          label='Más Solicitados'
          icon={<TrendingIcon fontSize='small' />}
          iconPosition='start'
        />
      </Tabs>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder='Buscar servicios...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                label='Categoría'
              >
                <MenuItem value='all'>Todas</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Precio</InputLabel>
              <Select
                value={priceFilter}
                onChange={e => setPriceFilter(e.target.value)}
                label='Tipo de Precio'
              >
                <MenuItem value='all'>Todos</MenuItem>
                <MenuItem value='fixed'>Precio Fijo</MenuItem>
                <MenuItem value='hourly'>Por Hora</MenuItem>
                <MenuItem value='consultation'>Consulta</MenuItem>
                <MenuItem value='quote'>Bajo Cotización</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth>
              <InputLabel>Dificultad</InputLabel>
              <Select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value)}
                label='Dificultad'
              >
                <MenuItem value='all'>Todas</MenuItem>
                <MenuItem value='easy'>Fácil</MenuItem>
                <MenuItem value='medium'>Medio</MenuItem>
                <MenuItem value='hard'>Difícil</MenuItem>
                <MenuItem value='expert'>Experto</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Results count */}
      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
        Mostrando {filteredServices.length} servicio
        {filteredServices.length !== 1 ? 's' : ''}
      </Typography>

      {/* Services Grid */}
      <Grid container spacing={3}>
        {filteredServices.map(service => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={service.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Chip
                    label={service.category.name}
                    size='small'
                    color='primary'
                    variant='outlined'
                  />
                  <IconButton
                    size='small'
                    onClick={() => toggleFavorite(service.id)}
                  >
                    {favorites.includes(service.id) ? (
                      <FavoriteIcon color='error' fontSize='small' />
                    ) : (
                      <FavoriteBorderIcon fontSize='small' />
                    )}
                  </IconButton>
                </Box>

                <Typography variant='h6' gutterBottom noWrap>
                  {service.name}
                </Typography>

                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {service.short_description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {service.is_featured && (
                    <Chip label='Destacado' size='small' color='warning' />
                  )}
                  {service.is_most_requested && (
                    <Chip label='Popular' size='small' color='success' />
                  )}
                  <Chip
                    label={getDifficultyLabel(service.difficulty)}
                    size='small'
                    color={getDifficultyColor(service.difficulty) as any}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon fontSize='small' color='action' />
                  <Typography
                    variant='body2'
                    fontWeight='medium'
                    color='primary'
                  >
                    {getPriceDisplay(service)}
                  </Typography>
                </Box>

                {service.estimated_duration && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <ScheduleIcon fontSize='small' color='action' />
                    <Typography variant='caption' color='text.secondary'>
                      {service.estimated_duration}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions>
                <Button
                  size='small'
                  startIcon={<InfoIcon />}
                  onClick={() => handleServiceClick(service)}
                >
                  Detalles
                </Button>
                <Button
                  size='small'
                  variant='contained'
                  onClick={() => handleRequestService(service)}
                >
                  Solicitar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredServices.length === 0 && (
        <Alert severity='info' sx={{ mt: 4 }}>
          No se encontraron servicios con los filtros seleccionados.
        </Alert>
      )}

      {/* Service Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        {selectedService && (
          <>
            <DialogTitle>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant='h5'>{selectedService.name}</Typography>
                <Chip label={selectedService.category.name} color='primary' />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant='body1' paragraph>
                {selectedService.full_description}
              </Typography>

              <Typography variant='h6' gutterBottom sx={{ mt: 3 }}>
                Detalles del Servicio
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Precio:
                  </Typography>
                  <Typography variant='body1' fontWeight='medium'>
                    {getPriceDisplay(selectedService)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Duración:
                  </Typography>
                  <Typography variant='body1'>
                    {selectedService.estimated_duration || 'Por definir'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Dificultad:
                  </Typography>
                  <Chip
                    label={getDifficultyLabel(selectedService.difficulty)}
                    size='small'
                    color={
                      getDifficultyColor(selectedService.difficulty) as any
                    }
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Popularidad:
                  </Typography>
                  <Typography variant='body1'>
                    {selectedService.requests_count} solicitudes
                  </Typography>
                </Grid>
              </Grid>

              {selectedService.requirements && (
                <>
                  <Typography variant='h6' gutterBottom sx={{ mt: 3 }}>
                    Requisitos
                  </Typography>
                  <Typography variant='body2'>
                    {selectedService.requirements}
                  </Typography>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
              <Button
                variant='contained'
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleRequestService(selectedService);
                }}
              >
                Solicitar Servicio
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Service Request Dialog */}
      <Dialog
        open={requestDialogOpen}
        onClose={() => !requestLoading && setRequestDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Solicitar Servicio</DialogTitle>
        <DialogContent dividers>
          {requestSuccess ? (
            <Alert severity='success'>
              ¡Solicitud enviada exitosamente! Nos pondremos en contacto pronto.
            </Alert>
          ) : (
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
            >
              <TextField
                fullWidth
                label='Nombre Completo *'
                value={requestForm.requester_name}
                onChange={e =>
                  setRequestForm({
                    ...requestForm,
                    requester_name: e.target.value,
                  })
                }
                disabled={requestLoading}
              />

              <TextField
                fullWidth
                label='Email *'
                type='email'
                value={requestForm.requester_email}
                onChange={e =>
                  setRequestForm({
                    ...requestForm,
                    requester_email: e.target.value,
                  })
                }
                disabled={requestLoading}
              />

              <TextField
                fullWidth
                label='Teléfono *'
                value={requestForm.requester_phone}
                onChange={e =>
                  setRequestForm({
                    ...requestForm,
                    requester_phone: e.target.value,
                  })
                }
                disabled={requestLoading}
              />

              <TextField
                fullWidth
                label='Mensaje *'
                multiline
                rows={4}
                value={requestForm.message}
                onChange={e =>
                  setRequestForm({ ...requestForm, message: e.target.value })
                }
                placeholder='Describe los detalles de lo que necesitas...'
                disabled={requestLoading}
              />

              <TextField
                fullWidth
                label='Fecha Preferida'
                type='date'
                value={requestForm.preferred_date}
                onChange={e =>
                  setRequestForm({
                    ...requestForm,
                    preferred_date: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
                disabled={requestLoading}
              />

              <TextField
                fullWidth
                label='Presupuesto Estimado'
                value={requestForm.budget_range}
                onChange={e =>
                  setRequestForm({
                    ...requestForm,
                    budget_range: e.target.value,
                  })
                }
                placeholder='Ej: $500.000 - $1.000.000'
                disabled={requestLoading}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRequestDialogOpen(false)}
            disabled={requestLoading}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmitRequest}
            disabled={
              requestLoading ||
              requestSuccess ||
              !requestForm.requester_name ||
              !requestForm.requester_email ||
              !requestForm.message
            }
          >
            {requestLoading ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ServicesMarketplace;
