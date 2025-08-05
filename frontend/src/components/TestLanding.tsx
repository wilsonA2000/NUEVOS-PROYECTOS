import React from 'react';
import { Box, Typography, Container, Button } from '@mui/material';

const TestLanding: React.FC = () => {

return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ 
        p: 4, 
        border: '3px solid #00ff00', 
        borderRadius: 2, 
        bgcolor: '#f0fff0',
        textAlign: 'center'
      }}>
        <Typography variant="h3" color="success.main" gutterBottom>
          🎉 ¡TEST LANDING FUNCIONA!
        </Typography>
        
        <Typography variant="h5" paragraph>
          Si ves esto, el router está funcionando correctamente
        </Typography>
        
        <Typography variant="body1" paragraph>
          Estado: Router funcionando ✅
        </Typography>
        
        <Button 
          variant="contained" 
          color="success" 
          size="large"
          onClick={() => {

alert('¡El router está funcionando!');
          }}
        >
          🎯 Test Button
        </Button>
      </Box>
    </Container>
  );
};

export default TestLanding; 