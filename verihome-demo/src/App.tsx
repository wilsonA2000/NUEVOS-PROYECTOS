import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { PropertiesPage } from './pages/PropertiesPage';
import { ServicesPage } from './pages/ServicesPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { MessagingPage } from './pages/MessagingPage';
import { ContractsPage } from './pages/ContractsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'landlord' | 'tenant' | 'service_provider' | null>(null);

  const handleLogin = (type: 'landlord' | 'tenant' | 'service_provider') => {
    setIsAuthenticated(true);
    setUserType(type);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          isAuthenticated={isAuthenticated} 
          userType={userType}
          onLogout={handleLogout}
        />
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/propiedades" element={<PropertiesPage />} />
          <Route path="/servicios" element={<ServicesPage />} />
          <Route path="/nosotros" element={<AboutPage />} />
          <Route path="/contacto" element={<ContactPage />} />
          
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <LoginPage onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/registro" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <RegisterPage onRegister={handleLogin} />
            } 
          />
          
          {/* Rutas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
                <DashboardPage userType={userType} /> : 
                <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/mensajes" 
            element={
              isAuthenticated ? 
                <MessagingPage /> : 
                <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/contratos" 
            element={
              isAuthenticated ? 
                <ContractsPage /> : 
                <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/pagos" 
            element={
              isAuthenticated ? 
                <PaymentsPage /> : 
                <Navigate to="/login" replace />
            } 
          />
          
          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
