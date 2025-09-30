import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Button,
  Divider,
  IconButton,
  Breadcrumbs,
  Modal,
  Backdrop,
  Fade,
  Container,
  Paper,
  Avatar,
  Stack,
  Rating,
  Tooltip,
  Fab,
  CircularProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Home as HomeIcon,
  Hotel as HotelIcon,
  Bathtub as BathtubIcon,
  SquareFoot as SquareFootIcon,
  AttachMoney as AttachMoneyIcon,
  Message as MessageIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  PhotoCamera as PhotoIcon,
  Videocam as VideoIcon,
  LocationOn as LocationIcon,
  DirectionsCar as CarIcon,
  Pets as PetsIcon,
  SmokeFree as NoSmokingIcon,
  SmokingRooms as SmokingIcon,
  LocalParking as ParkingIcon,
  Security as SecurityIcon,
  Pool as PoolIcon,
  FitnessCenter as GymIcon,
  LocalLaundryService as LaundryIcon,
  Wifi as WifiIcon,
  Kitchen as KitchenIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Visibility as ViewsIcon,
  NavigateNext as NavigateNextIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Handshake as HandshakeIcon,
  TrendingUp as TrendingUpIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { styled, alpha, useTheme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import { useProperty, useProperties } from '../../hooks/useProperties';
import { useAuth } from '../../hooks/useAuth';
import PropertyImage from '../common/PropertyImage';
import { ModernImageGallery } from './ModernImageGallery';
import MatchRequestForm from '../matching/MatchRequestForm';
import { matchingService } from '../../services/matchingService';

// Styled components for modern design
const HeroSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  marginBottom: theme.spacing(3),
  background: 'linear-gradient(145deg, #667eea 0%, #764ba2 100%)',
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
}));

const ImageGallery = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: 500,
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  '& .main-image': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease-in-out',
  },
  '&:hover .main-image': {
    transform: 'scale(1.02)',
  },
}));

const ImageOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  padding: theme.spacing(3),
  color: 'white',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
    transform: 'translateY(-4px)',
  },
}));

const FeatureChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  borderRadius: theme.spacing(3),
  padding: theme.spacing(0.5, 1),
  fontSize: '0.875rem',
  fontWeight: 600,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
}));

const PriceDisplay = styled(Typography)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  fontWeight: 700,
  letterSpacing: '-0.02em',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  padding: theme.spacing(1.5, 3),
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
}));

const ThumbnailGrid = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  overflowX: 'auto',
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': {
    height: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: alpha(theme.palette.grey[300], 0.3),
    borderRadius: theme.spacing(1),
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: theme.spacing(1),
  },
}));

const MapContainer = styled(Box)(({ theme }) => ({
  height: 300,
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

const InfoSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(2),
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

const StatBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1.5),
  background: alpha(theme.palette.primary.main, 0.05),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.1),
    transform: 'translateY(-2px)',
  },
}));

const FloatingActions = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(3),
  right: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  zIndex: 1000,
  [theme.breakpoints.down('sm')]: {
    bottom: theme.spacing(2),
    right: theme.spacing(2),
  },
}));

// Enhanced Video Player Component
const VideoPlayer: React.FC<{ video: any; index: number }> = ({ video, index }) => {
  console.log('🎥 VideoPlayer rendering video:', video.title, 'Full video object:', video);
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      let videoId = '';
      
      if (url.includes('v=')) {
        // Standard YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID
        videoId = url.split('v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        // Short YouTube URL: https://youtu.be/VIDEO_ID
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('/embed/')) {
        // Already an embed URL: https://www.youtube.com/embed/VIDEO_ID
        videoId = url.split('/embed/')[1].split('?')[0];
      } else {
        // Last resort: try to extract anything that looks like a video ID
        const parts = url.split('/');
        videoId = parts[parts.length - 1].split('?')[0];
      }
      
      // Validate video ID (YouTube video IDs are typically 11 characters, can contain letters, numbers, _ and -)
      const validIdPattern = /^[a-zA-Z0-9_-]{10,12}$/;
      if (!videoId || !validIdPattern.test(videoId)) {
        console.error('🎥 Invalid YouTube video ID:', videoId, 'from URL:', url);
        return '';
      }
      
      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
      console.log('🎥 Generated embed URL:', embedUrl);
      return embedUrl;
      
    } catch (error) {
      console.error('🎥 Error processing YouTube URL:', error, url);
      return '';
    }
  };

  return (
    <Box 
      sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }
      }}
    >
      {(() => {
        // Check if YouTube URL exists and is valid
        if (video.youtube_url) {
          const embedUrl = getYouTubeEmbedUrl(video.youtube_url);
          if (embedUrl) {
            return (
              <Box sx={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={embedUrl}
                  title={video.title || `Video ${index + 1}`}
                  frameBorder="0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '8px 8px 0 0'
                  }}
                />
              </Box>
            );
          } else {
            // Invalid YouTube URL
            return (
              <Box 
                sx={{ 
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'error.light',
                  color: 'error.contrastText',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                <VideoIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                <Typography variant="caption" align="center">
                  URL de YouTube inválida
                  <br />
                  {video.youtube_url}
                </Typography>
              </Box>
            );
          }
        }
        // Check for regular video files
        else if (video.video_url || video.video) {
          return (
            <video
              controls
              preload="metadata"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              poster={video.thumbnail_url || video.thumbnail}
            >
              <source src={video.video_url || video.video} type="video/mp4" />
              <source src={video.video_url || video.video} type="video/webm" />
              <source src={video.video_url || video.video} type="video/ogg" />
              Tu navegador no soporta el elemento de video.
            </video>
          );
        }
        // No video available
        else {
          return (
            <Box 
              sx={{ 
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                color: 'text.secondary',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <VideoIcon sx={{ fontSize: 48, opacity: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Video no disponible
              </Typography>
            </Box>
          );
        }
      })()}
      
      {(video.title || video.description) && (
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          {video.title && (
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {video.title}
            </Typography>
          )}
          {video.description && (
            <Typography variant="body2" color="text.secondary" sx={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {video.description}
            </Typography>
          )}
          {video.duration && (
            <Typography variant="caption" color="primary.main" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              mt: 1 
            }}>
              <VideoIcon sx={{ fontSize: 14 }} />
              Duración: {video.duration}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export const PropertyDetail: React.FC = () => {
  console.log('🔥 Using NAMED EXPORT PropertyDetail component');
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { property, isLoading, error } = useProperty(id || '');
  const { deleteProperty } = useProperties();
  
  // State management
  const [matchRequestDialogOpen, setMatchRequestDialogOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);
  const [existingMatchRequest, setExistingMatchRequest] = useState<any>(null);
  const [checkingExistingRequest, setCheckingExistingRequest] = useState(true);
  
  // Effects
  useEffect(() => {
    if (property) {
      setIsFavorited(property.is_favorited || false);
      // Simulate map loading
      const timer = setTimeout(() => setMapLoaded(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [property]);

  // Check for existing match request
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!property?.id || !isAuthenticated || user?.user_type !== 'tenant') {
        setCheckingExistingRequest(false);
        return;
      }

      try {
        const response = await matchingService.checkExistingMatchRequest(property.id);
        if (response.data.has_existing_request) {
          setExistingMatchRequest(response.data.request);
        }
      } catch (error) {
        console.error('Error checking existing request:', error);
      } finally {
        setCheckingExistingRequest(false);
      }
    };

    checkExistingRequest();
  }, [property?.id, isAuthenticated, user?.user_type]);

  // Helper functions
  const formatPrice = (price?: number, type: 'rent' | 'sale' = 'rent') => {
    if (!price) return 'Precio no disponible';
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
    return type === 'rent' ? `${formatted}/mes` : formatted;
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      apartment: 'Apartamento',
      house: 'Casa',
      studio: 'Estudio',
      penthouse: 'Penthouse',
      townhouse: 'Casa de Ciudad',
      commercial: 'Comercial',
      office: 'Oficina',
      warehouse: 'Bodega',
      land: 'Terreno',
      room: 'Habitación',
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'rented': return 'primary';
      case 'maintenance': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: 'Disponible',
      rented: 'Arrendado',
      maintenance: 'Mantenimiento',
      pending: 'Pendiente',
      inactive: 'Inactivo',
    };
    return labels[status] || status;
  };

  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (!property?.images) return;
    if (direction === 'prev') {
      setCurrentImageIndex(prev => 
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    } else {
      setCurrentImageIndex(prev => 
        prev === property.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const toggleFavorite = async () => {
    if (!property || !isAuthenticated) return;
    try {
      setIsFavorited(!isFavorited);
      // TODO: Implement favorite API call
      console.log('Toggle favorite for property:', property.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsFavorited(!isFavorited); // Revert on error
    }
  };

  const handleCancelExistingRequest = async () => {
    if (!property?.id) return;
    
    try {
      await matchingService.cancelMatchRequest(property.id);
      setExistingMatchRequest(null);
      // Mostrar notificación de éxito
      console.log('✅ Solicitud cancelada exitosamente');
    } catch (error) {
      console.error('❌ Error cancelando solicitud:', error);
    }
  };

  const handleMatchRequestSubmit = async (data: any) => {
    if (!property || !user) return;
    
    setIsSubmittingMatch(true);
    try {
      const response = await matchingService.createMatchRequest({
        property: property.id,
        tenant_message: data.tenant_message,
        tenant_phone: data.tenant_phone || '',
        tenant_email: data.tenant_email || user.email,
        monthly_income: data.monthly_income,
        employment_type: data.employment_type || 'other',
        preferred_move_in_date: data.preferred_move_in_date,
        lease_duration_months: data.lease_duration_months,
        has_rental_references: data.has_rental_references,
        has_employment_proof: data.has_employment_proof,
        has_credit_check: data.has_credit_check,
        number_of_occupants: data.number_of_occupants,
        has_pets: data.has_pets,
        pet_details: data.pet_details,
        smoking_allowed: data.smoking_allowed,
        priority: data.priority || 'medium'
      });

      console.log('✅ Match request enviado exitosamente:', response.data);
      
      // Cerrar modal y mostrar éxito
      setMatchRequestDialogOpen(false);
      
      // Actualizar estado para reflejar que ahora hay una solicitud enviada
      setExistingMatchRequest({
        id: response.data.id,
        match_code: response.data.match_code,
        status: 'pending',
        priority: response.data.priority,
        created_at: new Date().toISOString(),
        tenant_message: response.data.tenant_message,
        can_update: true,
        can_cancel: true
      });
      
      // Opcional: Redirigir a dashboard de matches
      // navigate('/app/requests');
      
    } catch (error: any) {
      console.error('❌ Error enviando match request:', error);
      throw error; // Re-throw para que MatchRequestForm maneje el error
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  const getAmenityIcon = (category: string) => {
    switch (category) {
      case 'security': return <SecurityIcon />;
      case 'recreation': return <PoolIcon />;
      case 'parking': return <ParkingIcon />;
      case 'utilities': return <WifiIcon />;
      default: return <HomeIcon />;
    }
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2, mb: 2 }} />
            <Box display="flex" gap={1}>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} variant="rectangular" width={120} height={80} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mb: 2 }} />
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
            borderRadius: 3,
            p: 4,
            color: 'white',
            mb: 3,
          }}
        >
          <Typography variant="h4" gutterBottom fontWeight={700}>
            ¡Oops! Algo salió mal
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, mb: 3 }}>
            {error.message || 'No pudimos cargar los detalles de la propiedad'}
          </Typography>
          <ActionButton
            variant="contained"
            size="large"
            onClick={() => window.location.reload()}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            Reintentar
          </ActionButton>
        </Box>
      </Container>
    );
  }

  if (!property) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ffa726, #ff7043)',
            borderRadius: 3,
            p: 4,
            color: 'white',
            mb: 3,
          }}
        >
          <Typography variant="h4" gutterBottom fontWeight={700}>
            Propiedad no encontrada
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, mb: 3 }}>
            La propiedad que buscas no está disponible o ha sido removida
          </Typography>
          <ActionButton
            variant="contained"
            size="large"
            onClick={() => navigate('/app/properties')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            Explorar Propiedades
          </ActionButton>
        </Box>
      </Container>
    );
  }

  // Permission checks
  const isLandlord = user?.user_type === 'landlord';
  const isTenant = user?.user_type === 'tenant';
  const isServiceProvider = user?.user_type === 'service_provider';
  const isPropertyOwner = property.landlord?.id === user?.id;
  const canEdit = isLandlord && isPropertyOwner;
  const canContact = (isTenant || isServiceProvider) && !isPropertyOwner;

  // Find main image or use first image as fallback
  const mainImage = (() => {
    if (!property.images || property.images.length === 0) {
      return property.main_image_url || '/images/property-placeholder.svg';
    }
    
    // Look for image marked as main
    const mainImg = property.images.find(img => img.is_main);
    if (mainImg) {
      return mainImg.image_url || mainImg.image;
    }
    
    // Fallback to first image
    const firstImg = property.images[0];
    return firstImg.image_url || firstImg.image || '/images/property-placeholder.svg';
  })();

  // Get all images sorted by order and main status
  const sortedImages = property.images ? [...property.images].sort((a, b) => {
    if (a.is_main) return -1;
    if (b.is_main) return 1;
    return a.order - b.order;
  }) : [];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Button
          color="inherit"
          onClick={() => navigate('/app/properties')}
          sx={{ p: 0, minWidth: 'auto', textTransform: 'none' }}
        >
          Propiedades
        </Button>
        <Typography color="text.primary" fontWeight={600}>
          {property.title}
        </Typography>
      </Breadcrumbs>

      <Grid container spacing={4}>
        {/* Main Content */}
        <Grid item xs={12} lg={8}>
          {/* Modern Image Gallery */}
          <Box sx={{ position: 'relative', mb: 4 }}>
            {/* Property info overlay on gallery */}
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                right: 20,
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                pointerEvents: 'none',
              }}
            >
              <Box sx={{ pointerEvents: 'auto' }}>
                <Chip
                  label={getStatusLabel(property.status)}
                  color={getStatusColor(property.status) as any}
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    bgcolor: 'rgba(255,255,255,0.95)',
                    color: 'text.primary',
                    backdropFilter: 'blur(10px)',
                    mb: 2,
                  }}
                />
                
                <Box
                  sx={{
                    // EFECTO GLASSMORPHISM - Vidrio translúcido
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)',
                    backdropFilter: 'blur(15px) saturate(180%)',
                    borderRadius: 4,
                    p: 3,
                    color: '#1a1a1a',
                    maxWidth: 420,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    position: 'relative',
                    textShadow: 'none', // Quitar text-shadow para mejor legibilidad
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                      borderRadius: 4,
                      zIndex: -1,
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
                      borderRadius: 4,
                      zIndex: -1,
                    }
                  }}
                >
                  <Typography 
                    variant="h4" 
                    fontWeight={800} 
                    gutterBottom
                    sx={{
                      color: '#1a1a1a',
                      fontWeight: 900,
                      letterSpacing: '0.01em',
                      textShadow: '0 1px 2px rgba(255,255,255,0.5)', // Sombra blanca sutil
                    }}
                  >
                    {property.title}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <LocationIcon sx={{ 
                      fontSize: 18,
                      color: '#333333',
                    }} />
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#2a2a2a',
                        fontWeight: 600,
                        textShadow: '0 1px 2px rgba(255,255,255,0.3)',
                      }}
                    >
                      {property.address}, {property.city}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={2} mt={2}>
                    {property.rent_price && (
                      <Typography 
                        variant="h5" 
                        fontWeight={800} 
                        sx={{ 
                          color: '#1B5E20', // Verde oscuro para contraste
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)',
                          padding: '8px 16px',
                          borderRadius: 3,
                          border: '1px solid rgba(27, 94, 32, 0.2)',
                          boxShadow: '0 4px 12px rgba(27, 94, 32, 0.15)',
                          letterSpacing: '0.01em',
                          textShadow: '0 1px 2px rgba(255,255,255,0.5)',
                        }}
                      >
                        {formatPrice(property.rent_price, 'rent')}
                      </Typography>
                    )}
                    {property.sale_price && (
                      <Typography 
                        variant="h5" 
                        fontWeight={800} 
                        sx={{ 
                          color: '#1B5E20', // Verde oscuro para contraste
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)',
                          padding: '8px 16px',
                          borderRadius: 3,
                          border: '1px solid rgba(27, 94, 32, 0.2)',
                          boxShadow: '0 4px 12px rgba(27, 94, 32, 0.15)',
                          letterSpacing: '0.01em',
                          textShadow: '0 1px 2px rgba(255,255,255,0.5)',
                        }}
                      >
                        {formatPrice(property.sale_price, 'sale')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                {property.images && property.images.length > 0 && (
                  <Chip
                    icon={<PhotoIcon />}
                    label={`${property.images.length} foto${property.images.length > 1 ? 's' : ''}`}
                    sx={{ 
                      bgcolor: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                )}
                {property.videos && property.videos.length > 0 && (
                  <Chip
                    icon={<VideoIcon />}
                    label={`${property.videos.length} video${property.videos.length > 1 ? 's' : ''}`}
                    sx={{ 
                      bgcolor: 'rgba(0,0,0,0.8)', 
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                )}
              </Box>
            </Box>
            
            {/* Modern Image Gallery Component */}
            <ModernImageGallery
              images={sortedImages}
              title={property.title}
              initialIndex={currentImageIndex}
              onImageChange={setCurrentImageIndex}
            />
          </Box>

          {/* Property Details Cards */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Key Features */}
            <Grid item xs={12}>
              <StyledCard>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    Características Principales
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={6} sm={3}>
                      <StatBox>
                        <HotelIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight={700}>
                          {property.bedrooms}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Habitaciones
                        </Typography>
                      </StatBox>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <StatBox>
                        <BathtubIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight={700}>
                          {property.bathrooms}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Baños
                        </Typography>
                      </StatBox>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <StatBox>
                        <SquareFootIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight={700}>
                          {property.total_area}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          m² totales
                        </Typography>
                      </StatBox>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <StatBox>
                        <CarIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight={700}>
                          {property.parking_spaces}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Parqueaderos
                        </Typography>
                      </StatBox>
                    </Grid>
                  </Grid>
                </CardContent>
              </StyledCard>
            </Grid>
            
            {/* Property Description */}
            <Grid item xs={12}>
              <StyledCard>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    Descripción
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      lineHeight: 1.8,
                      color: 'text.secondary',
                      fontSize: '1.1rem'
                    }}
                  >
                    {property.description}
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>

            {/* Videos Section */}
            {property.videos && property.videos.length > 0 && (
              <Grid item xs={12}>
                <StyledCard>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                      <VideoIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                      <Typography variant="h5" fontWeight={700}>
                        Videos de la Propiedad ({property.videos.length})
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={3}>
                      {property.videos.map((video, index) => (
                        <Grid item xs={12} sm={6} lg={4} key={video.id || index}>
                          <VideoPlayer video={video} index={index} />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </StyledCard>
              </Grid>
            )}

            {/* Amenities Section */}
            {property.amenity_relations && property.amenity_relations.length > 0 && (
              <Grid item xs={12}>
                <StyledCard>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      Amenidades
                    </Typography>
                    <Grid container spacing={2}>
                      {property.amenity_relations
                        .filter(relation => relation.available)
                        .map((relation) => (
                          <Grid item key={relation.id}>
                            <FeatureChip 
                              icon={getAmenityIcon(relation.amenity.category)}
                              label={relation.amenity.name}
                              variant="outlined"
                              color="primary"
                            />
                          </Grid>
                        ))}
                    </Grid>
                  </CardContent>
                </StyledCard>
              </Grid>
            )}

            {/* Features and Utilities */}
            <Grid item xs={12}>
              <StyledCard>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    Características Adicionales
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {/* Property Features */}
                    {property.property_features && property.property_features.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" fontWeight={600} gutterBottom color="primary">
                          Características
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {property.property_features.map((feature, index) => (
                            <FeatureChip
                              key={index}
                              label={feature}
                              variant="filled"
                              color="secondary"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Utilities Included */}
                    {property.utilities_included && property.utilities_included.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" fontWeight={600} gutterBottom color="success.main">
                          Utilidades Incluidas
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {property.utilities_included.map((utility, index) => (
                            <FeatureChip
                              key={index}
                              label={utility}
                              variant="filled"
                              color="success"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Nearby Amenities */}
                    {property.nearby_amenities && property.nearby_amenities.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" fontWeight={600} gutterBottom color="info.main">
                          Lugares Cercanos
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {property.nearby_amenities.map((amenity, index) => (
                            <FeatureChip
                              key={index}
                              label={amenity}
                              variant="filled"
                              color="info"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Transportation */}
                    {property.transportation && property.transportation.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" fontWeight={600} gutterBottom color="warning.main">
                          Transporte
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {property.transportation.map((transport, index) => (
                            <FeatureChip
                              key={index}
                              label={transport}
                              variant="filled"
                              color="warning"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  {/* Property Rules and Details */}
                  <Divider sx={{ my: 3 }} />
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center" p={2}>
                        {property.furnished ? (
                          <Box sx={{ color: 'success.main' }}>
                            <KitchenIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="body2" fontWeight={600}>
                              Amueblado
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ color: 'text.disabled' }}>
                            <KitchenIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="body2">
                              Sin amueblar
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center" p={2}>
                        {property.pets_allowed ? (
                          <Box sx={{ color: 'success.main' }}>
                            <PetsIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="body2" fontWeight={600}>
                              Mascotas OK
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ color: 'error.main' }}>
                            <PetsIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="body2">
                              No mascotas
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center" p={2}>
                        {property.smoking_allowed ? (
                          <Box sx={{ color: 'warning.main' }}>
                            <SmokingIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="body2">
                              Fumar permitido
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ color: 'success.main' }}>
                            <NoSmokingIcon sx={{ fontSize: 32, mb: 1 }} />
                            <Typography variant="body2" fontWeight={600}>
                              No fumar
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center" p={2}>
                        <Box sx={{ color: 'primary.main' }}>
                          <CalendarIcon sx={{ fontSize: 32, mb: 1 }} />
                          <Typography variant="body2" fontWeight={600}>
                            {property.minimum_lease_term} meses mín.
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          {/* Contact Card */}
          <StyledCard sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Información de Contacto
              </Typography>
              
              {/* Landlord Info */}
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar
                  sx={{ 
                    width: 60, 
                    height: 60,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 700
                  }}
                >
                  {property.landlord.first_name?.[0]}{property.landlord.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {property.landlord.first_name} {property.landlord.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Propietario
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                    <Rating value={4.5} size="small" readOnly precision={0.1} />
                    <Typography variant="caption" color="text.secondary">
                      (12 reseñas)
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Price Summary */}
              <InfoSection elevation={0} sx={{ mb: 3 }}>
                {property.rent_price && (
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body1">Renta mensual</Typography>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      {formatPrice(property.rent_price, 'rent')}
                    </Typography>
                  </Box>
                )}
                {property.security_deposit && (
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary">Depósito</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatPrice(property.security_deposit)}
                    </Typography>
                  </Box>
                )}
                {property.maintenance_fee && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Administración</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatPrice(property.maintenance_fee)}
                    </Typography>
                  </Box>
                )}
              </InfoSection>
              
              {/* Action Buttons */}
              <Stack spacing={2}>
                {canContact && (
                  <>
                    {checkingExistingRequest ? (
                      <ActionButton
                        variant="outlined"
                        size="large"
                        disabled
                        fullWidth
                      >
                        Verificando solicitudes...
                      </ActionButton>
                    ) : existingMatchRequest ? (
                      <Box>
                        <InfoSection sx={{ mb: 2, p: 2, background: 'rgba(25, 118, 210, 0.1)', border: '1px solid rgba(25, 118, 210, 0.3)' }}>
                          <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                            Ya tienes una solicitud enviada
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Código:</strong> {existingMatchRequest.match_code}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Estado:</strong> 
                            <Chip 
                              label={existingMatchRequest.status === 'pending' ? 'Pendiente' : existingMatchRequest.status}
                              color={existingMatchRequest.status === 'pending' ? 'warning' : 'info'}
                              size="small" 
                              sx={{ ml: 1 }} 
                            />
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Mensaje:</strong> {existingMatchRequest.tenant_message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Enviada el {new Date(existingMatchRequest.created_at).toLocaleDateString('es-CO')}
                          </Typography>
                        </InfoSection>
                        
                        {existingMatchRequest.can_cancel && (
                          <ActionButton
                            variant="outlined"
                            size="large"
                            startIcon={<CancelIcon />}
                            onClick={handleCancelExistingRequest}
                            fullWidth
                            color="error"
                          >
                            Cancelar Solicitud
                          </ActionButton>
                        )}
                      </Box>
                    ) : (
                      <ActionButton
                        variant="contained"
                        size="large"
                        startIcon={<HandshakeIcon />}
                        onClick={() => setMatchRequestDialogOpen(true)}
                        fullWidth
                        disabled={isSubmittingMatch}
                        sx={{
                          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                          boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                          }
                        }}
                      >
                        {isSubmittingMatch ? 'Enviando...' : 'Enviar Solicitud'}
                      </ActionButton>
                    )}
                  </>
                )}
                
                {canEdit && (
                  <>
                    <ActionButton
                      variant="contained"
                      color="primary"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/app/properties/${property.id}/edit`)}
                      fullWidth
                    >
                      Editar Propiedad
                    </ActionButton>
                    
                    <ActionButton
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={async () => {
                        if (window.confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
                          try {
                            await deleteProperty.mutateAsync(property.id.toString());
                            navigate('/app/properties');
                          } catch (error) {
                            console.error('Error al eliminar propiedad:', error);
                          }
                        }
                      }}
                      fullWidth
                    >
                      Eliminar Propiedad
                    </ActionButton>
                  </>
                )}
              </Stack>
            </CardContent>
          </StyledCard>
          
          {/* Property Stats */}
          <StyledCard sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Estadísticas
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <ViewsIcon sx={{ fontSize: 28, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h5" fontWeight={700}>
                      {property.views_count || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visualizaciones
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <FavoriteIcon sx={{ fontSize: 28, color: 'error.main', mb: 1 }} />
                    <Typography variant="h5" fontWeight={700}>
                      {property.favorites_count || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Favoritos
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </StyledCard>
          
          {/* Map Section */}
          <StyledCard>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Ubicación
                </Typography>
              </Box>
              
              <MapContainer>
                {mapLoaded ? (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.100',
                      flexDirection: 'column',
                      gap: 2
                    }}
                  >
                    <LocationIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight={600}>
                        {property.address}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {property.city}, {property.state}
                      </Typography>
                      {property.postal_code && (
                        <Typography variant="caption" color="text.secondary">
                          C.P. {property.postal_code}
                        </Typography>
                      )}
                    </Box>
                    <ActionButton
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        const query = encodeURIComponent(`${property.address}, ${property.city}`);
                        window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
                      }}
                    >
                      Ver en Google Maps
                    </ActionButton>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CircularProgress />
                  </Box>
                )}
              </MapContainer>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>

      {/* Floating Action Buttons */}
      <FloatingActions>
        {isAuthenticated && (
          <Tooltip title={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'} placement="left">
            <Fab
              color={isFavorited ? 'error' : 'default'}
              onClick={toggleFavorite}
              sx={{ 
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                '&:hover': {
                  transform: 'scale(1.1)',
                }
              }}
            >
              {isFavorited ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </Fab>
          </Tooltip>
        )}
        
        <Tooltip title="Volver a propiedades" placement="left">
          <Fab
            onClick={() => navigate('/app/properties')}
            sx={{ 
              bgcolor: 'background.paper',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              '&:hover': {
                transform: 'scale(1.1)',
                bgcolor: 'grey.100',
              }
            }}
          >
            <ArrowBackIcon />
          </Fab>
        </Tooltip>
      </FloatingActions>

      {/* Image Gallery Modal */}
      <Modal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { bgcolor: 'rgba(0,0,0,0.9)' }
        }}
      >
        <Fade in={imageModalOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '95vw', md: '90vw' },
              height: { xs: '90vh', md: '80vh' },
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              p: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              borderBottom={1}
              borderColor="divider"
            >
              <Typography variant="h6" fontWeight={700}>
                Imagen {currentImageIndex + 1} de {property.images?.length}
              </Typography>
              <IconButton onClick={() => setImageModalOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            {/* Modal Content */}
            <Box
              sx={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'black',
              }}
            >
              {property.images && property.images[currentImageIndex] && (
                <Box
                  component="img"
                  src={property.images[currentImageIndex].image_url || property.images[currentImageIndex].image}
                  alt={`Vista ${currentImageIndex + 1}`}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              )}
              
              {/* Navigation buttons */}
              {property.images && property.images.length > 1 && (
                <>
                  <IconButton
                    onClick={() => handleImageNavigation('prev')}
                    sx={{
                      position: 'absolute',
                      left: 16,
                      color: 'white',
                      bgcolor: 'rgba(0,0,0,0.5)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                    }}
                  >
                    <ChevronLeftIcon fontSize="large" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleImageNavigation('next')}
                    sx={{
                      position: 'absolute',
                      right: 16,
                      color: 'white',
                      bgcolor: 'rgba(0,0,0,0.5)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                    }}
                  >
                    <ChevronRightIcon fontSize="large" />
                  </IconButton>
                </>
              )}
            </Box>
            
            {/* Thumbnail strip */}
            {property.images && property.images.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  p: 2,
                  overflowX: 'auto',
                  bgcolor: 'grey.50',
                }}
              >
                {property.images.map((image, index) => (
                  <Box
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    sx={{
                      minWidth: 80,
                      height: 60,
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: currentImageIndex === index ? '2px solid' : '1px solid',
                      borderColor: currentImageIndex === index ? 'primary.main' : 'divider',
                      opacity: currentImageIndex === index ? 1 : 0.7,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        opacity: 1,
                      }
                    }}
                  >
                    <Box
                      component="img"
                      src={image.image_url || image.image}
                      alt={`Thumbnail ${index + 1}`}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* Match Request Dialog */}
      {canContact && (
        <MatchRequestForm
          property={{
            id: property.id,
            title: property.title,
            rent_price: property.rent_price,
            city: property.city,
            state: property.state,
            property_type: property.property_type,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            total_area: property.total_area,
            pets_allowed: property.pets_allowed,
            landlord: {
              name: property.landlord?.first_name + ' ' + property.landlord?.last_name,
              email: property.landlord?.email || ''
            }
          }}
          open={matchRequestDialogOpen}
          onSubmit={handleMatchRequestSubmit}
          onCancel={() => setMatchRequestDialogOpen(false)}
          isSubmitting={isSubmittingMatch}
        />
      )}
    </Container>
  );
};