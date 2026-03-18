import React from 'react';
import { Box, Container } from '@mui/material';
import MatchesDashboard from '../../components/matching/MatchesDashboard';

const RequestsPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* ✅ Actualizado al nuevo sistema de Matches - Elimina errores 404 */}
        <MatchesDashboard />
      </Box>
    </Container>
  );
};

export default RequestsPage;