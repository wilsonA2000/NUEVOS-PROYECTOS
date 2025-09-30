import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Divider,
  Tooltip,
  Snackbar,
  Paper,
  Dialog,
  DialogContent,
  DialogActions,
  Slide,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Room as RoomIcon,
  VideoLibrary as VideoIcon,
  YouTube as YouTubeIcon,
  CloudUpload as CloudUploadIcon,
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  CheckCircleOutline as CheckCircleIcon,
  Home as HomeIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Autocomplete from '@mui/material/Autocomplete';
import axios from 'axios';
import { EnhancedPropertyImageUpload as PropertyImageUpload } from './EnhancedPropertyImageUpload';
import PropertyVideoUpload from './PropertyVideoUpload';
import { Alert as MuiAlert } from '@mui/material';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { TransitionProps } from '@mui/material/transitions';

// Fix for default marker icon in leaflet
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Componente de transición para el modal de éxito
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface PropertyFormData {
  title: string;
  description: string;
  property_type: string;
  listing_type: string;
  status: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: number | '';
  longitude: number | '';
  bedrooms: number | '';
  bathrooms: number | '';
  half_bathrooms: number | '';
  total_area: number | '';
  built_area: number | '';
  lot_area: number | '';
  parking_spaces: number | '';
  floors: number | '';
  floor_number: number | '';
  year_built: number | '';
  rent_price: number | '';
  sale_price: number | '';
  security_deposit: number | '';
  maintenance_fee: number | '';
  minimum_lease_term: number | '';
  maximum_lease_term: number | '';
  pets_allowed: boolean;
  smoking_allowed: boolean;
  furnished: boolean;
  utilities_included: string;
  property_features: string;
  nearby_amenities: string;
  transportation: string;
  available_from: string;
  is_featured: boolean;
  is_active: boolean;
  video_url: string;
  video_file: File | null;
}

interface PropertyFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  initialData?: any;
  isEditMode?: boolean;
}

// Coordenadas centrales de Colombia
const defaultPosition: [number, number] = [4.5709, -74.2973]; // Colombia

// CSS para ocultar flechas de los campos numéricos
const noSpinnerStyle = {
  // Chrome, Safari, Edge, Opera
  '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
  '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
  // Firefox
  '& input[type=number]': { MozAppearance: 'textfield' },
};

// Configuración de Mapbox usando variables de entorno
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DEFAULT_COUNTRY = import.meta.env.VITE_DEFAULT_COUNTRY || 'CO';
const DEFAULT_LAT = Number(import.meta.env.VITE_DEFAULT_LAT) || 4.5709;
const DEFAULT_LNG = Number(import.meta.env.VITE_DEFAULT_LNG) || -74.2973;
const DEFAULT_ZOOM = Number(import.meta.env.VITE_DEFAULT_ZOOM) || 6;

// Configuración de validación de archivos
const FILE_VALIDATION = {
  images: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxCount: 10,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  },
  videos: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov']
  }
};

// Funciones de validación de archivos
const validateImageFiles = (files: File[]): { valid: File[], errors: string[] } => {
  const errors: string[] = [];
  const valid: File[] = [];

  if (files.length > FILE_VALIDATION.images.maxCount) {
    errors.push(`Máximo ${FILE_VALIDATION.images.maxCount} imágenes permitidas`);
    return { valid: files.slice(0, FILE_VALIDATION.images.maxCount), errors };
  }

  files.forEach((file, index) => {
    // Validar tipo MIME
    if (!FILE_VALIDATION.images.allowedTypes.includes(file.type)) {
      errors.push(`Archivo ${index + 1}: Tipo no permitido. Use JPG, PNG o WebP`);
      return;
    }

    // Validar extensión
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!FILE_VALIDATION.images.allowedExtensions.includes(extension)) {
      errors.push(`Archivo ${index + 1}: Extensión no permitida`);
      return;
    }

    // Validar tamaño
    if (file.size > FILE_VALIDATION.images.maxSize) {
      const maxSizeMB = FILE_VALIDATION.images.maxSize / (1024 * 1024);
      errors.push(`Archivo ${index + 1}: Tamaño máximo ${maxSizeMB}MB`);
      return;
    }

    valid.push(file);
  });

  return { valid, errors };
};

const validateVideoFile = (file: File): { valid: boolean, error?: string } => {
  // Validar tipo MIME
  if (!FILE_VALIDATION.videos.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de video no permitido. Use MP4, WebM o MOV' };
  }

  // Validar extensión
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!FILE_VALIDATION.videos.allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Extensión de video no permitida' };
  }

  // Validar tamaño
  if (file.size > FILE_VALIDATION.videos.maxSize) {
    const maxSizeMB = FILE_VALIDATION.videos.maxSize / (1024 * 1024);
    return { valid: false, error: `Tamaño máximo para video: ${maxSizeMB}MB` };
  }

  return { valid: true };
};

const PropertyForm: React.FC<PropertyFormProps> = ({ 
  onSubmit, 
  isLoading = false, 
  error, 
  initialData, 
  isEditMode = false 
}) => {
  const navigate = useNavigate();
  const [videoMode, setVideoMode] = useState<'url' | 'file'>('url');
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoder = useRef<MapboxGeocoder | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  // Función para generar valores por defecto basados en initialData
  const getDefaultValues = useCallback(() => {
    if (isEditMode && initialData) {
      return {
        title: initialData.title || '',
        description: initialData.description || '',
        property_type: initialData.property_type || '',
        listing_type: initialData.listing_type || '',
        status: initialData.status || 'available',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        country: initialData.country || 'Colombia',
        postal_code: initialData.postal_code || '',
        latitude: initialData.latitude?.toString() || '',
        longitude: initialData.longitude?.toString() || '',
        bedrooms: initialData.bedrooms?.toString() || '',
        bathrooms: initialData.bathrooms?.toString() || '',
        half_bathrooms: initialData.half_bathrooms?.toString() || '',
        total_area: initialData.total_area?.toString() || '',
        built_area: initialData.built_area?.toString() || '',
        lot_area: initialData.lot_area?.toString() || '',
        parking_spaces: initialData.parking_spaces?.toString() || '',
        floors: initialData.floors?.toString() || '',
        floor_number: initialData.floor_number?.toString() || '',
        year_built: initialData.year_built?.toString() || '',
        rent_price: initialData.rent_price?.toString() || '',
        sale_price: initialData.sale_price?.toString() || '',
        security_deposit: initialData.security_deposit?.toString() || '',
        maintenance_fee: initialData.maintenance_fee?.toString() || '',
        minimum_lease_term: initialData.minimum_lease_term?.toString() || '',
        maximum_lease_term: initialData.maximum_lease_term?.toString() || '',
        pets_allowed: initialData.pets_allowed || false,
        smoking_allowed: initialData.smoking_allowed || false,
        furnished: initialData.furnished || false,
        utilities_included: Array.isArray(initialData.utilities_included) 
          ? initialData.utilities_included.join(', ') 
          : initialData.utilities_included || '',
        property_features: Array.isArray(initialData.property_features)
          ? initialData.property_features.join(', ')
          : initialData.property_features || '',
        nearby_amenities: Array.isArray(initialData.nearby_amenities)
          ? initialData.nearby_amenities.join(', ')
          : initialData.nearby_amenities || '',
        transportation: Array.isArray(initialData.transportation)
          ? initialData.transportation.join(', ')
          : initialData.transportation || '',
        available_from: initialData.available_from || '',
        is_featured: initialData.is_featured || false,
        is_active: initialData.is_active ?? true,
        video_url: '',
        video_file: null,
      };
    }
    
    // Valores por defecto para modo creación
    return {
      title: '',
      description: '',
      property_type: '',
      listing_type: '',
      status: 'available',
      address: '',
      city: '',
      state: '',
      country: 'Colombia',
      postal_code: '',
      latitude: '',
      longitude: '',
      bedrooms: '',
      bathrooms: '',
      half_bathrooms: '',
      total_area: '',
      built_area: '',
      lot_area: '',
      parking_spaces: '',
      floors: '',
      floor_number: '',
      year_built: '',
      rent_price: '',
      sale_price: '',
      security_deposit: '',
      maintenance_fee: '',
      minimum_lease_term: '',
      maximum_lease_term: '',
      pets_allowed: false,
      smoking_allowed: false,
      furnished: false,
      utilities_included: '',
      property_features: '',
      nearby_amenities: '',
      transportation: '',
      available_from: '',
      is_featured: false,
      is_active: true,
      video_url: '',
      video_file: null,
    };
  }, [isEditMode, initialData]);

  // Efecto para cargar imágenes existentes en modo edición
  useEffect(() => {
    if (isEditMode && initialData && initialData.images) {
      const existingImages = initialData.images.map((img: any, index: number) => ({
        id: `existing-${img.id || index}`,
        url: img.image_url || img.image,
        isMain: img.is_main || index === 0,
        uploading: false,
        progress: 100,
        // No incluir file para imágenes existentes
      }));
      setPropertyImages(existingImages);
    }
    
    // Cargar videos existentes si los hay
    if (isEditMode && initialData && initialData.videos) {
      const existingVideos = initialData.videos.map((video: any, index: number) => ({
        id: video.id || index,
        title: video.title || `Video ${index + 1}`,
        description: video.description || '',
        type: video.youtube_url ? 'youtube' : 'file',
        order: index,
        ...(video.youtube_url ? {
          youtube: {
            id: video.youtube_url.split('v=')[1]?.split('&')[0] || '',
            url: video.youtube_url,
            title: video.title,
            thumbnail: `https://img.youtube.com/vi/${video.youtube_url.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg`,
          }
        } : {
          metadata: {
            id: `existing-${video.id || index}`,
            preview: video.video_url,
            thumbnail: video.thumbnail_url || '',
            duration: 0,
            resolution: 'Unknown'
          }
        })
      }));
      setPropertyVideos(existingVideos);
    }
  }, [isEditMode, initialData]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PropertyFormData>({
    defaultValues: getDefaultValues(),
    mode: 'onBlur',
  });

  // Estado para autocompletado y ubicación
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [capturedAddress, setCapturedAddress] = useState('');
  const [capturedCoords, setCapturedCoords] = useState<[number, number] | null>(null);

  // Estado para el buscador de direcciones
  const [addressOptions, setAddressOptions] = useState([]);
  const [searchAddress, setSearchAddress] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [locationValidated, setLocationValidated] = useState(false);
  const [showLocationNotification, setShowLocationNotification] = useState(false);
  
  // Estados para los nuevos componentes de imagen y video
  const [propertyImages, setPropertyImages] = useState<any[]>([]);
  const [propertyVideos, setPropertyVideos] = useState<any[]>([]);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [selectedLocationText, setSelectedLocationText] = useState('No seleccionada');
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Variables de estado faltantes
  const [addressLoading, setAddressLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  
  // Estado para mensajes de confirmación
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProperty, setCreatedProperty] = useState<any>(null);

  // Estado para errores de imágenes y videos
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [videoError, setVideoError] = useState<string>('');

  // Buscar sugerencias de dirección
  const handleAddressSearch = useCallback(async (addressInput: string) => {
    if (!addressInput || addressInput.length < 3) return;
    
    try {
      setAddressLoading(true);
      const res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressInput)}.json`, {
        params: {
          access_token: MAPBOX_TOKEN,
          country: DEFAULT_COUNTRY,
          types: 'address,poi',
          limit: 5,
        },
      });
      
      if (res.data.features) {
        setAddressSuggestions(res.data.features);
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  // Inicializar Mapbox
  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [DEFAULT_LNG, DEFAULT_LAT], // Coordenadas por defecto desde .env
      zoom: DEFAULT_ZOOM,
    });
    marker.current = new mapboxgl.Marker({ draggable: true })
      .setLngLat([DEFAULT_LNG, DEFAULT_LAT]) // Coordenadas por defecto desde .env
      .addTo(map.current);
    map.current.on('click', (e) => {
      marker.current!.setLngLat(e.lngLat);
      setLocationCaptured(false);
    });
    marker.current.on('dragend', () => {
      setLocationCaptured(false);
    });
    return () => map.current?.remove();
  }, []);

  // Efecto para búsqueda automática de direcciones
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressInput.length >= 3) {
        handleAddressSearch(addressInput);
      } else {
        setAddressSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [addressInput, handleAddressSearch]);

  // Cuando el usuario selecciona una sugerencia
  const handleSuggestionSelect = (suggestion: any) => {
    setSelectedSuggestion(suggestion);
    setAddressInput(suggestion.place_name);
    setAddressSuggestions([]);
    
    // Centrar el mapa en la ubicación seleccionada
    if (map.current) {
      map.current.flyTo({ 
        center: suggestion.center, 
        zoom: 16, 
        speed: 1.5,
        essential: true
      });
      marker.current?.setLngLat(suggestion.center);
      
      // Actualizar los valores del formulario
      setValue('address', suggestion.place_name);
      setValue('latitude', suggestion.center[1]);
      setValue('longitude', suggestion.center[0]);
      
      // Extraer información adicional de la dirección
      const context = suggestion.context || [];
      const city = context.find((c: any) => c.id.startsWith('place'))?.text || '';
      const state = context.find((c: any) => c.id.startsWith('region'))?.text || '';
      const country = context.find((c: any) => c.id.startsWith('country'))?.text || '';
      
      if (city) setValue('city', city);
      if (state) setValue('state', state);
      if (country) setValue('country', country);
    }
    setLocationCaptured(false);
  };

  // Capturar ubicación y sincronizar con campos del formulario
  const handleCaptureLocation = useCallback(async () => {
    if (!map.current || !marker.current) {
      setSuccessMessage('⚠️ Por favor selecciona una ubicación en el mapa primero');
      setShowSuccessMessage(true);
      return;
    }

    const lngLat = marker.current.getLngLat();
    const lat = lngLat.lat;
    const lng = lngLat.lng;

    try {
      // Usar reverse geocoding para obtener información de la dirección
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            language: 'es',
          }
        }
      );

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const context = feature.context || [];
        
        // Actualizar dirección completa
        const fullAddress = feature.place_name || addressInput;
        setValue('address', fullAddress);
        setAddressInput(fullAddress);
        setCapturedAddress(fullAddress);
        
        // Actualizar coordenadas
        setValue('latitude', lat.toFixed(6));
        setValue('longitude', lng.toFixed(6));
        setCapturedCoords([lng, lat]);
        
        // Extraer y actualizar ciudad
        const place = context.find((c: any) => c.id.includes('place') || c.id.includes('locality'));
        if (place) {
          setValue('city', place.text);
        }
        
        // Extraer y actualizar estado/departamento
        const region = context.find((c: any) => c.id.includes('region') || c.id.includes('district'));
        if (region) {
          setValue('state', region.text);
        }
        
        // Extraer y actualizar código postal si existe
        const postcode = context.find((c: any) => c.id.includes('postcode'));
        if (postcode) {
          setValue('postal_code', postcode.text);
        }
        
        // Actualizar país
        const country = context.find((c: any) => c.id.includes('country'));
        setValue('country', country ? country.text : 'Colombia');
        
        setLocationCaptured(true);
        setSuccessMessage('✅ Ubicación capturada y campos actualizados exitosamente');
        setShowSuccessMessage(true);
        
        // Desactivar el mapa después de capturar
        if (mapContainer.current) {
          mapContainer.current.style.pointerEvents = 'none';
        }
      }
    } catch (error) {
      console.error('Error capturando ubicación:', error);
      // Fallback: usar solo las coordenadas sin geocoding
      setValue('latitude', lat.toFixed(6));
      setValue('longitude', lng.toFixed(6));
      setValue('address', addressInput || 'Ubicación seleccionada');
      setCapturedCoords([lng, lat]);
      setLocationCaptured(true);
      setSuccessMessage('✅ Ubicación capturada (sin detalles de dirección)');
      setShowSuccessMessage(true);
    }
  }, [addressInput, setValue, MAPBOX_TOKEN]);

  // Video field logic
  const handleVideoModeChange = (mode: 'url' | 'file') => {
    setVideoMode(mode);
    setValue('video_url', '');
    setValue('video_file', null);
  };

  // Buscar direcciones con Mapbox
  const handleLocationSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3) return;
    
    try {
      setLocationLoading(true);
      const res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
        params: {
          access_token: MAPBOX_TOKEN,
          country: DEFAULT_COUNTRY,
          types: 'place,locality,neighborhood',
          limit: 5,
        },
      });
      
      if (res.data.features) {
        setLocationSuggestions(res.data.features);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Cuando seleccionas una dirección, centra el mapa y actualiza el address
  const handleAddressSelect = (option: any) => {
    if (!option) return;
    
    setSelectedAddress(option);
    setValue('address', option.place_name);
    setValue('latitude', option.center[1]);
    setValue('longitude', option.center[0]);
    setMarkerPosition([option.center[1], option.center[0]]);
    setLocationValidated(true);
    setShowLocationNotification(true);
  };

  // Validar ubicación seleccionada
  const handleLocationValidation = () => {
    if (selectedAddress) {
      setLocationValidated(true);
      setShowLocationNotification(true);
    }
  };

  // Cerrar notificación
  const handleCloseNotification = () => {
    setShowLocationNotification(false);
  };

  const onFormSubmit = async (data: PropertyFormData) => {
    // Starting form submission
    
    // Crear FormData para enviar archivos
    const formData = new FormData();
    
    // Agregar campos del formulario con validación adecuada
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'video_file' && value) {
        formData.append('video_file', value as File);
      } else if (key === 'rent_price' || key === 'sale_price' || key === 'total_area') {
        // For numeric fields, only include them if they have a valid value
        if (value !== '' && value !== undefined && value !== null && !isNaN(Number(value))) {
          formData.append(key, String(Number(value)));
        }
      } else if (key === 'description') {
        // Description is required - use default if empty
        const desc = value && String(value).trim() !== '' ? String(value) : 'Descripción no disponible';
        formData.append(key, desc);
      } else if (key === 'state') {
        // State is required - use default if empty
        const state = value && String(value).trim() !== '' ? String(value) : 'No especificado';
        formData.append(key, state);
      } else if (key === 'year_built' || key === 'bedrooms' || key === 'bathrooms' || key === 'half_bathrooms' || key === 'parking_spaces') {
        // Integer fields - only include if valid
        if (value !== '' && value !== undefined && value !== null && !isNaN(Number(value))) {
          formData.append(key, String(Number(value)));
        }
      } else if (key === 'available_from') {
        // Date field - only include if valid
        if (value && String(value).trim() !== '' && String(value) !== 'Invalid date') {
          formData.append(key, String(value));
        }
      } else if (key === 'utilities_included' || key === 'property_features' || key === 'nearby_amenities' || key === 'transportation') {
        // Convert comma-separated strings to JSON arrays
        if (value && String(value).trim() !== '') {
          const arrayValue = String(value).split(',').map(item => item.trim()).filter(item => item !== '');
          formData.append(key, JSON.stringify(arrayValue));
        } else {
          formData.append(key, JSON.stringify([]));
        }
      } else if (value !== '' && value !== undefined && value !== null) {
        // For other non-empty fields, convert to string
        formData.append(key, String(value));
      }
    });
    
    // Agregar imágenes desde PropertyImageUpload component
    let mainImageFile: File | null = null;
    let mainImageId: string | null = null;
    
    propertyImages.forEach((img, idx) => {
      if (img.file) { // Solo agregar nuevas imágenes (que tienen archivo)
        formData.append('images', img.file);
        if (img.isMain) {
          mainImageFile = img.file;
        }
      }
      
      // Capturar ID de imagen principal (existente o nueva)
      if (img.isMain) {
        // Si es imagen existente, usar el ID original
        if (img.id && img.id.startsWith('existing-')) {
          mainImageId = img.id.replace('existing-', '');
        }
      }
    });
    
    // Agregar imagen principal si es archivo nuevo
    if (mainImageFile) {
      formData.append('main_image', mainImageFile);
    }
    
    // Agregar ID de imagen principal si es imagen existente
    if (mainImageId) {
      formData.append('main_image_id', mainImageId);
    }
    
    // ARREGLO CRÍTICO: Separar lógica de archivos de video y URLs de YouTube
    const videoFiles = [];
    const youtubeUrls = [];
    const videoMetadata = {};
    const youtubeMetadata = {};
    
    // Separar videos por tipo y recopilar metadatos
    propertyVideos.forEach((video, idx) => {
      if (video.type === 'file' && video.file) {
        videoFiles.push(video.file);
        videoMetadata[`video_${videoFiles.length - 1}_title`] = video.title || '';
        videoMetadata[`video_${videoFiles.length - 1}_description`] = video.description || '';
      } else if (video.type === 'youtube' && video.youtube?.url) {
        youtubeUrls.push(video.youtube.url);
        youtubeMetadata[`youtube_${youtubeUrls.length - 1}_title`] = video.title || '';
        youtubeMetadata[`youtube_${youtubeUrls.length - 1}_description`] = video.description || '';
      }
    });
    
    // Agregar archivos de video al FormData
    videoFiles.forEach(file => {
      formData.append('video_files', file);
    });
    
    // Agregar metadatos de videos
    Object.entries(videoMetadata).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Agregar URLs de YouTube como un array (sin duplicados)
    const uniqueYoutubeUrls = [...new Set(youtubeUrls)]; // Eliminar duplicados
    uniqueYoutubeUrls.forEach(url => {
      formData.append('youtube_urls', url);
    });
    
    // Agregar metadatos de YouTube
    Object.entries(youtubeMetadata).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // FormData created with images
    
    try {
      // Submitting form data
      const result = await onSubmit(formData);
      // Property created successfully
      
      // Guardar información de la propiedad creada
      setCreatedProperty({
        title: data.title,
        property_type: data.property_type,
        listing_type: data.listing_type,
        city: data.city,
        result: result
      });
      
      // Mostrar modal de éxito profesional
      setShowSuccessModal(true);
      
    } catch (error: any) {
      console.error('❌ PropertyForm: Error al crear la propiedad:', error);
      
      // Mostrar errores específicos del servidor
      let errorMessage = 'Error al crear la propiedad.';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          errorMessage += ` ${errorMessages}`;
        }
      }
      
      setSuccessMessage(errorMessage);
      setShowSuccessMessage(true);
    }
  };

  // Previsualización de video
  const videoUrl = watch('video_url');
  const videoFile = watch('video_file');

  // Mostrar campos dinámicamente según tipo de propiedad y tipo de listado
  const listingType = watch('listing_type');
  const propertyType = watch('property_type');

  // Funciones para manejar el modal de éxito
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedProperty(null);
  };

  const handleGoToProperties = () => {
    handleCloseSuccessModal();
    navigate('/app/properties');
  };

  const handleViewProperty = () => {
    if (createdProperty?.result?.id) {
      handleCloseSuccessModal();
      navigate(`/app/properties/${createdProperty.result.id}`);
    } else {
      handleGoToProperties();
    }
  };

  const handleCreateAnother = () => {
    handleCloseSuccessModal();
    reset();
    setPropertyImages([]);
    setPropertyVideos([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `}
      </style>
      <Card>
        <CardContent>
        <Typography variant="h5" gutterBottom>
          {isEditMode ? 'Editar Propiedad' : 'Crear Nueva Propiedad'}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Tooltip title="Título descriptivo de la propiedad" arrow placement="top">
                <span><Controller
                  name="title"
                  control={control}
                  rules={{ required: 'El título es requerido' }}
                  render={({ field }) => (
                    <TextField {...field} label="Título" fullWidth error={!!errors.title} helperText={errors.title?.message || 'Obligatorio'} required id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={6}>
              <Tooltip title="Tipo de propiedad" arrow placement="top">
                <span><Controller
                  name="property_type"
                  control={control}
                  rules={{ required: 'El tipo es requerido' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.property_type}>
                      <InputLabel htmlFor={`propertyform-${field.name}`}>Tipo de Propiedad</InputLabel>
                      <Select {...field} label="Tipo de Propiedad">
                        <MenuItem value="apartment">Apartamento</MenuItem>
                        <MenuItem value="house">Casa</MenuItem>
                        <MenuItem value="studio">Estudio</MenuItem>
                        <MenuItem value="penthouse">Penthouse</MenuItem>
                        <MenuItem value="townhouse">Casa en Condominio</MenuItem>
                        <MenuItem value="commercial">Comercial</MenuItem>
                        <MenuItem value="office">Oficina</MenuItem>
                        <MenuItem value="warehouse">Bodega</MenuItem>
                        <MenuItem value="land">Terreno</MenuItem>
                        <MenuItem value="room">Habitación</MenuItem>
                        <MenuItem value="habitacion">Habitacion</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={6}>
              <Tooltip title="Tipo de listado" arrow placement="top">
                <span><Controller
                  name="listing_type"
                  control={control}
                  rules={{ required: 'El tipo de listado es requerido' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.listing_type}>
                      <InputLabel htmlFor={`propertyform-${field.name}`}>Tipo de Listado</InputLabel>
                      <Select {...field} label="Tipo de Listado">
                        <MenuItem value="rent">Renta</MenuItem>
                        <MenuItem value="sale">Venta</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={6}>
              <Tooltip title="Estado de la propiedad" arrow placement="top">
                <span><Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel htmlFor={`propertyform-${field.name}`}>Estado</InputLabel>
                      <Select {...field} label="Estado">
                        <MenuItem value="available">Disponible</MenuItem>
                        <MenuItem value="rented">Rentada</MenuItem>
                        <MenuItem value="maintenance">En Mantenimiento</MenuItem>
                        <MenuItem value="pending">Pendiente</MenuItem>
                        <MenuItem value="inactive">Inactiva</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12}>
              <Tooltip title="Descripción de la propiedad" arrow placement="top">
                <span><Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Descripción" fullWidth multiline rows={3} id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={1}>
                <TextField
                  label="Dirección"
                  value={addressInput}
                  onChange={e => {
                    setAddressInput(e.target.value);
                    setLocationCaptured(false);
                  }}
                  fullWidth
                  id="propertyform-address"
                  autoComplete="street-address"
                />
                <Button
                  variant={locationCaptured ? 'contained' : 'outlined'}
                  color={locationCaptured ? 'success' : 'primary'}
                  onClick={handleCaptureLocation}
                  sx={{ minWidth: 160 }}
                >
                  {locationCaptured ? 'Ubicación capturada' : 'Capturar ubicación'}
                </Button>
              </Box>
              {/* Sugerencias de autocompletado */}
              {addressSuggestions.length > 0 && (
                <Paper sx={{ position: 'absolute', zIndex: 10, width: '100%' }}>
                  {addressSuggestions.map(sug => (
                    <Box
                      key={sug.id}
                      sx={{ p: 1, cursor: 'pointer', '&:hover': { bgcolor: 'grey.100' } }}
                      onClick={() => handleSuggestionSelect(sug)}
                    >
                      {sug.place_name}
                    </Box>
                  ))}
                </Paper>
              )}
              {locationCaptured && (
                <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                  ✓ Ubicación capturada: {capturedAddress}
                </Typography>
              )}
            </Grid>
            {/* Campos de ubicación adicionales */}
            <Grid item xs={12} md={4}>
              <Tooltip title="Ciudad de la propiedad" arrow placement="top">
                <span><Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Ciudad" fullWidth id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Estado o provincia de la propiedad" arrow placement="top">
                <span><Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Estado/Provincia" fullWidth id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Código postal de la propiedad" arrow placement="top">
                <span><Controller
                  name="postal_code"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Código Postal" fullWidth id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ my: 2, position: 'relative' }}>
                {/* Map Overlay for better interaction */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                  onClick={(e) => {
                    // Enable map interaction on click
                    const mapDiv = mapContainer.current;
                    if (mapDiv) {
                      mapDiv.style.pointerEvents = 'auto';
                      // Auto-disable after interaction
                      setTimeout(() => {
                        if (mapDiv) mapDiv.style.pointerEvents = 'none';
                      }, 10000); // 10 seconds of interaction
                    }
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      px: 3,
                      py: 2,
                      borderRadius: 2,
                      boxShadow: 2,
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        boxShadow: 3,
                      }
                    }}
                  >
                    <Typography variant="subtitle2" align="center">
                      📍 Haz clic aquí para interactuar con el mapa
                    </Typography>
                    <Typography variant="caption" color="text.secondary" align="center" display="block">
                      Podrás mover el marcador y seleccionar la ubicación exacta
                    </Typography>
                  </Box>
                </Box>
                
                <div
                  ref={mapContainer}
                  style={{
                    height: '340px',
                    width: '100%',
                    borderRadius: '12px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#f5f5f5',
                    pointerEvents: 'none', // Start disabled
                  }}
                />
                
                {/* Instructions below map */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  💡 Haz clic en el mapa para activar la interacción. Mueve el marcador para seleccionar la ubicación exacta y luego haz clic en "Capturar ubicación".
                </Typography>
              </Box>
            </Grid>
            {/* Campos numéricos y detalles */}
            <Grid item xs={12} md={2}>
              <Tooltip title="Número de habitaciones de la propiedad" arrow placement="top">
                <span><Controller
                  name="bedrooms"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Habitaciones" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Número de baños de la propiedad" arrow placement="top">
                <span><Controller
                  name="bathrooms"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Baños" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Área total de la propiedad en metros cuadrados" arrow placement="top">
                <span><Controller
                  name="total_area"
                  control={control}
                  rules={{ 
                    required: 'El área total es requerida',
                    min: { value: 1, message: 'El área total debe ser mayor a 0' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Área Total (m²)"
                      fullWidth
                      inputMode="decimal"
                      type="text"
                      sx={noSpinnerStyle}
                      value={field.value === 0 ? '' : field.value}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : val.replace(/[^0-9.]/g, ''));
                      }}
                      required
                      error={!!errors.total_area}
                      helperText={errors.total_area?.message || 'Obligatorio. Solo números.'}
                      inputProps={{ minLength: 1, maxLength: 7 }}
                      id={`propertyform-${field.name}`}
                    />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Área construida de la propiedad en metros cuadrados" arrow placement="top">
                <span><Controller
                  name="built_area"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Área Construida (m²)"
                      fullWidth
                      inputMode="decimal"
                      type="text"
                      sx={noSpinnerStyle}
                      value={field.value === 0 ? '' : field.value}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : val.replace(/[^0-9.]/g, ''));
                      }}
                      required
                      inputProps={{ minLength: 1, maxLength: 7 }}
                      helperText="Obligatorio. Solo números."
                      id={`propertyform-${field.name}`}
                    />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Área del terreno de la propiedad en metros cuadrados" arrow placement="top">
                <span><Controller
                  name="lot_area"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Área Terreno (m²)"
                      fullWidth
                      inputMode="decimal"
                      type="text"
                      sx={noSpinnerStyle}
                      value={field.value === 0 ? '' : field.value}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : val.replace(/[^0-9.]/g, ''));
                      }}
                      required
                      inputProps={{ minLength: 1, maxLength: 7 }}
                      helperText="Obligatorio. Solo números."
                      id={`propertyform-${field.name}`}
                    />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Número de estacionamientos de la propiedad" arrow placement="top">
                <span><Controller
                  name="parking_spaces"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Estacionamientos" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Número de pisos de la propiedad" arrow placement="top">
                <span><Controller
                  name="floors"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Pisos" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Número de piso de la propiedad" arrow placement="top">
                <span><Controller
                  name="floor_number"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Número de Piso" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Año de construcción de la propiedad" arrow placement="top">
                <span><Controller
                  name="year_built"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Año de Construcción" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            {/* Precios y condiciones */}
            {listingType === 'rent' && (
              <Grid item xs={12} md={2}>
                <Tooltip title="Precio de renta mensual en pesos colombianos" arrow placement="top">
                  <span><Controller
                    name="rent_price"
                    control={control}
                    rules={{ 
                      required: 'El precio de renta es requerido',
                      min: { value: 1, message: 'El precio debe ser mayor a 0' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Precio Renta"
                        fullWidth
                        inputMode="decimal"
                        type="text"
                        sx={noSpinnerStyle}
                        value={field.value === 0 ? '' : field.value}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : val.replace(/[^0-9.]/g, ''));
                        }}
                        required
                        error={!!errors.rent_price}
                        helperText={errors.rent_price?.message || "Obligatorio. Solo números."}
                        inputProps={{ minLength: 3, maxLength: 10 }}
                        id={`propertyform-${field.name}`}
                      />
                    )}
                  /></span>
                </Tooltip>
              </Grid>
            )}
            {listingType === 'sale' && (
              <Grid item xs={12} md={2}>
                <Tooltip title="Precio de venta de la propiedad" arrow placement="top">
                  <span><Controller
                    name="sale_price"
                    control={control}
                    rules={{ 
                      required: 'El precio de venta es requerido',
                      min: { value: 1, message: 'El precio debe ser mayor a 0' }
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Precio Venta"
                        fullWidth
                        inputMode="decimal"
                        type="text"
                        sx={noSpinnerStyle}
                        value={field.value === 0 ? '' : field.value}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : val.replace(/[^0-9.]/g, ''));
                        }}
                        required
                        error={!!errors.sale_price}
                        helperText={errors.sale_price?.message || "Obligatorio. Solo números."}
                        inputProps={{ minLength: 3, maxLength: 10 }}
                        id={`propertyform-${field.name}`}
                      />
                    )}
                  /></span>
                </Tooltip>
              </Grid>
            )}
            <Grid item xs={12} md={2}>
              <Tooltip title="Depósito de garantía en pesos mexicanos" arrow placement="top">
                <span><Controller
                  name="security_deposit"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Depósito Garantía" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Cuota de mantenimiento mensual en pesos mexicanos" arrow placement="top">
                <span><Controller
                  name="maintenance_fee"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Cuota Mantenimiento" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Plazo mínimo de renta en meses" arrow placement="top">
                <span><Controller
                  name="minimum_lease_term"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Plazo Mín. Renta (meses)" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Plazo máximo de renta en meses" arrow placement="top">
                <span><Controller
                  name="maximum_lease_term"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Plazo Máx. Renta (meses)" fullWidth inputMode="decimal" type="text" id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            {/* Opciones adicionales */}
            <Grid item xs={12} md={2}>
              <Tooltip title="Permitir mascotas en la propiedad" arrow placement="top">
                <span><Controller
                  name="pets_allowed"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel control={<Checkbox {...field} checked={field.value} id={`propertyform-${field.name}`} name={field.name} />} label="Mascotas" />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Permitir fumar en la propiedad" arrow placement="top">
                <span><Controller
                  name="smoking_allowed"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel control={<Checkbox {...field} checked={field.value} id={`propertyform-${field.name}`} name={field.name} />} label="Fumar" />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={2}>
              <Tooltip title="Amueblada la propiedad" arrow placement="top">
                <span><Controller
                  name="furnished"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel control={<Checkbox {...field} checked={field.value} id={`propertyform-${field.name}`} name={field.name} />} label="Amueblada" />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            {/* Amenidades y características */}
            <Grid item xs={12} md={4}>
              <Tooltip title="Servicios incluidos en la propiedad" arrow placement="top">
                <span><Controller
                  name="utilities_included"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Servicios Incluidos" fullWidth id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Características de la propiedad" arrow placement="top">
                <span><Controller
                  name="property_features"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Características" fullWidth id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Comodidades cercanas a la propiedad" arrow placement="top">
                <span><Controller
                  name="nearby_amenities"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Comodidades" fullWidth id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Transporte cercano a la propiedad" arrow placement="top">
                <span><Controller
                  name="transportation"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Transporte Cercano" fullWidth id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tooltip title="Disponibilidad de la propiedad" arrow placement="top">
                <span><Controller
                  name="available_from"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Disponible Desde" type="date" fullWidth InputLabelProps={{ shrink: true }} id={`propertyform-${field.name}`} />
                  )}
                /></span>
              </Tooltip>
            </Grid>
            {/* Sección de Imágenes */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1 }}>
                Imágenes de la Propiedad
              </Typography>
              <PropertyImageUpload
                images={propertyImages}
                onImagesChange={setPropertyImages}
                maxImages={10}
                disabled={isLoading}
              />
            </Grid>
            
            {/* Sección de Videos */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1 }}>
                Videos de la Propiedad
              </Typography>
              <PropertyVideoUpload
                videos={propertyVideos}
                onChange={setPropertyVideos}
                maxVideos={5}
                disabled={isLoading}
              />
            </Grid>
            {/* Botones */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => navigate('/app/properties')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {isLoading 
                    ? (isEditMode ? 'Actualizando...' : 'Creando...') 
                    : (isEditMode ? 'Actualizar Propiedad' : 'Crear Propiedad')
                  }
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
        <Snackbar
          open={showLocationNotification}
          autoHideDuration={4000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <MuiAlert onClose={handleCloseNotification} severity="success" sx={{ width: '100%' }}>
            ¡Ubicación guardada correctamente!
          </MuiAlert>
        </Snackbar>
        {/* Mensaje de confirmación */}
        {showSuccessMessage && (
          <Alert 
            severity="success" 
            sx={{ mt: 2 }}
            onClose={() => setShowSuccessMessage(false)}
          >
            {successMessage}
          </Alert>
        )}

        {/* Modal de éxito profesional */}
        <Dialog
          open={showSuccessModal}
          TransitionComponent={Transition}
          keepMounted
          onClose={handleCloseSuccessModal}
          aria-describedby="success-dialog-description"
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            }
          }}
        >
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ mb: 3 }}>
              <CheckCircleIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'success.main',
                  mb: 2,
                  animation: 'pulse 2s infinite'
                }} 
              />
              <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'success.main', fontWeight: 'bold' }}>
                ¡Propiedad Creada Exitosamente!
              </Typography>
            </Box>

            {createdProperty && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  {createdProperty.title}
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Tipo:</strong> {createdProperty.property_type === 'apartment' ? 'Apartamento' : 
                                           createdProperty.property_type === 'house' ? 'Casa' : 
                                           createdProperty.property_type === 'room' ? 'Habitación' : 
                                           createdProperty.property_type}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Modalidad:</strong> {createdProperty.listing_type === 'rent' ? 'Arriendo' : 'Venta'}
                    </Typography>
                  </Grid>
                  {createdProperty.city && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Ubicación:</strong> {createdProperty.city}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Su propiedad ha sido registrada exitosamente en nuestra plataforma. 
              Ahora estará visible para potenciales inquilinos y compradores.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
              💡 <strong>Próximos pasos:</strong> Puede revisar su propiedad, editarla si es necesario, 
              o crear una nueva propiedad para expandir su portafolio.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
            <Button
              onClick={handleViewProperty}
              variant="contained"
              startIcon={<VisibilityIcon />}
              sx={{ minWidth: 140 }}
            >
              Ver Propiedad
            </Button>
            <Button
              onClick={handleCreateAnother}
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ minWidth: 140 }}
            >
              Crear Otra
            </Button>
            <Button
              onClick={handleGoToProperties}
              variant="text"
              sx={{ minWidth: 120 }}
            >
              Ver Todas
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
    </>
  );
};

export default PropertyForm; 