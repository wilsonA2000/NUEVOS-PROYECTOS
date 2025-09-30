import React from 'react';
import { Box, Container } from '@mui/material';
import RequestsDashboard from '../../components/requests/RequestsDashboard';

const RequestsPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box py={3}>
        <RequestsDashboard />
      </Box>
    </Container>
  );
};

export default RequestsPage;