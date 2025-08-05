import React, { useState } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudDownload as DownloadIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Storage as StorageIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useServiceWorker, usePWAInstall, usePushNotifications } from '../hooks/useServiceWorker';

interface ServiceWorkerUpdateProps {
  onUpdateComplete?: () => void;
}

const ServiceWorkerUpdate: React.FC<ServiceWorkerUpdateProps> = ({ onUpdateComplete }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const {
    isSupported,
    isRegistered,
    isInstalling,
    updateAvailable,
    skipWaiting,
    getCacheSize,
    clearCache,
    error,
  } = useServiceWorker();

  const {
    isInstallable,
    isInstalled,
    promptInstall,
  } = usePWAInstall();

  const {
    permission: notificationPermission,
    isSupported: pushSupported,
    requestPermission,
    subscribe,
  } = usePushNotifications();

  const handleUpdate = () => {
    skipWaiting();
    setUpdateDismissed(true);
    onUpdateComplete?.();
  };

  const handleInstallPWA = async () => {
    const accepted = await promptInstall();
    if (accepted) {

}
  };

  const handleShowDetails = async () => {
    const size = await getCacheSize();
    setCacheSize(size);
    setShowDetails(true);
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearCache();
      setCacheSize(0);
    } catch (error) {
      console.error('Error limpiando cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleEnableNotifications = async () => {
    const permission = await requestPermission();
    if (permission === 'granted') {
      await subscribe();
    }
  };

  // Notification para actualizaciones disponibles
  if (updateAvailable && !updateDismissed) {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 2 }}
      >
        <Alert
          severity="info"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                onClick={handleUpdate}
                startIcon={<RefreshIcon />}
              >
                Actualizar
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setUpdateDismissed(true)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          <Typography variant="body2">
            Nueva versión disponible. Actualiza para obtener las últimas mejoras.
          </Typography>
        </Alert>
      </Snackbar>
    );
  }

  // Notification para instalación de PWA
  if (isInstallable) {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        autoHideDuration={10000}
      >
        <Alert
          severity="success"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleInstallPWA}
              startIcon={<DownloadIcon />}
            >
              Instalar
            </Button>
          }
        >
          <Typography variant="body2">
            Instala VeriHome para una mejor experiencia
          </Typography>
        </Alert>
      </Snackbar>
    );
  }

  // Estado del Service Worker (solo en desarrollo o para debugging)
  if (process.env.NODE_ENV === 'development' || window.location.search.includes('debug=sw')) {
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Estado del Service Worker */}
          <Chip
            icon={isRegistered ? <WifiIcon /> : <WifiOffIcon />}
            label={`SW: ${isRegistered ? 'Activo' : 'Inactivo'}`}
            color={isRegistered ? 'success' : 'error'}
            size="small"
            onClick={handleShowDetails}
            clickable
          />

          {/* Estado de PWA */}
          {isInstalled && (
            <Chip
              icon={<DownloadIcon />}
              label="PWA Instalada"
              color="success"
              size="small"
            />
          )}

          {/* Estado de notificaciones */}
          {pushSupported && (
            <Chip
              label={`Push: ${notificationPermission}`}
              color={notificationPermission === 'granted' ? 'success' : 'warning'}
              size="small"
              onClick={notificationPermission !== 'granted' ? handleEnableNotifications : undefined}
              clickable={notificationPermission !== 'granted'}
            />
          )}

          {/* Loading state */}
          {isInstalling && (
            <Chip
              icon={<RefreshIcon />}
              label="Instalando..."
              color="info"
              size="small"
            />
          )}

          {/* Error state */}
          {error && (
            <Chip
              label="Error SW"
              color="error"
              size="small"
              onClick={() => console.error('SW Error:', error)}
            />
          )}
        </Box>

        {/* Dialog con detalles */}
        <Dialog
          open={showDetails}
          onClose={() => setShowDetails(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StorageIcon />
              Detalles del Service Worker
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Estado general */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Estado General
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Soportado: ${isSupported ? 'Sí' : 'No'}`}
                    color={isSupported ? 'success' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={`Registrado: ${isRegistered ? 'Sí' : 'No'}`}
                    color={isRegistered ? 'success' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={`PWA: ${isInstalled ? 'Instalada' : 'No instalada'}`}
                    color={isInstalled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Cache */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Cache del Navegador
                </Typography>
                {cacheSize !== null && (
                  <Typography variant="body2" color="text.secondary">
                    Elementos en cache: {cacheSize}
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleClearCache}
                    disabled={isClearing}
                    startIcon={<RefreshIcon />}
                  >
                    {isClearing ? 'Limpiando...' : 'Limpiar Cache'}
                  </Button>
                </Box>
                {isClearing && <LinearProgress sx={{ mt: 1 }} />}
              </Box>

              {/* Notificaciones */}
              {pushSupported && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Notificaciones Push
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estado: {notificationPermission}
                  </Typography>
                  {notificationPermission !== 'granted' && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleEnableNotifications}
                      >
                        Habilitar Notificaciones
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {/* Error */}
              {error && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="error">
                    Error
                  </Typography>
                  <Typography variant="body2" color="error">
                    {error}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setShowDetails(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return null;
};

export default ServiceWorkerUpdate;