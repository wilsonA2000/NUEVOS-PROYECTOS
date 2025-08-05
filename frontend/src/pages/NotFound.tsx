import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: { xs: 2, sm: 3 },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <Typography 
          variant="h1" 
          color="primary" 
          sx={{
            fontSize: { xs: '6rem', sm: '8rem' },
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          404
        </Typography>
        <Typography 
          variant="h4" 
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem' },
            fontWeight: 600,
          }}
        >
          Página No Encontrada
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem' },
            maxWidth: '400px',
            mb: { xs: 2, sm: 3 },
          }}
        >
          La página que estás buscando podría haber sido eliminada, haber cambiado su nombre
          o estar temporalmente no disponible.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => navigate('/')}
          sx={{
            px: { xs: 3, sm: 4 },
            py: { xs: 1, sm: 1.5 },
            fontSize: { xs: '0.875rem', sm: '1rem' },
          }}
        >
          Volver al Inicio
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound; 