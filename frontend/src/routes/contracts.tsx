import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ContractList } from '../components/contracts/ContractList';
import { ContractForm } from '../components/contracts/ContractForm';
import { ContractDetail } from '../components/contracts/ContractDetail';
import MatchedCandidatesView from '../components/contracts/MatchedCandidatesView';
import TenantContractView from '../components/contracts/TenantContractView';
import BiometricAuthenticationPage from '../pages/contracts/BiometricAuthenticationPage';
import DigitalSignaturePage from '../pages/contracts/DigitalSignaturePage';
import { useAuth } from '../hooks/useAuth';
import { Alert, Box } from '@mui/material';

// Componente de protección para rutas exclusivas de landlord
const LandlordOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (user?.user_type !== 'landlord') {
    return (
      <Box p={3}>
        <Alert severity="warning">
          Solo los arrendadores pueden acceder a esta función. 
          Como arrendatario, puedes revisar los contratos que te han enviado desde el módulo de contratos.
        </Alert>
      </Box>
    );
  }
  
  return <>{children}</>;
};

// Componente de protección para rutas exclusivas de tenant
const TenantOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (user?.user_type !== 'tenant' && user?.user_type !== 'candidate') {
    return (
      <Box p={3}>
        <Alert severity="warning">
          Esta función es exclusiva para inquilinos y candidatos. 
          Los arrendadores pueden gestionar sus procesos desde "Candidatos Aprobados".
        </Alert>
      </Box>
    );
  }
  
  return <>{children}</>;
};

const ContractRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ContractList />} />
      <Route 
        path="/matched-candidates" 
        element={
          <LandlordOnlyRoute>
            <MatchedCandidatesView />
          </LandlordOnlyRoute>
        } 
      />
      <Route 
        path="/my-processes" 
        element={
          <TenantOnlyRoute>
            <TenantContractView />
          </TenantOnlyRoute>
        } 
      />
      <Route 
        path="/new" 
        element={
          <LandlordOnlyRoute>
            <ContractForm />
          </LandlordOnlyRoute>
        } 
      />
      <Route path="/:id" element={<ContractDetail />} />
      <Route 
        path="/:id/edit" 
        element={
          <LandlordOnlyRoute>
            <ContractForm />
          </LandlordOnlyRoute>
        } 
      />
      <Route 
        path="/:id/authenticate" 
        element={<BiometricAuthenticationPage />} 
      />
      <Route 
        path="/:id/sign" 
        element={<DigitalSignaturePage />} 
      />
    </Routes>
  );
};

export default ContractRoutes; 