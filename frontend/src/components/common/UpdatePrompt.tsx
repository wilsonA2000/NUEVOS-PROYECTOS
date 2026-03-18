import React, { useState } from 'react';
import { Snackbar, Alert, Button, IconButton } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useServiceWorker } from '../../hooks/useServiceWorker';

const UpdatePrompt: React.FC = () => {
  const { updateAvailable, updateApp } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 2 }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button
              color="inherit"
              size="small"
              onClick={updateApp}
              startIcon={<RefreshIcon />}
              sx={{ fontWeight: 600 }}
            >
              Actualizar
            </Button>
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setDismissed(true)}
              aria-label="Cerrar"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      >
        Nueva version disponible
      </Alert>
    </Snackbar>
  );
};

export default UpdatePrompt;
