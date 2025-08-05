import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import TestLanding from '../components/TestLanding';
import Dashboard from '../pages/Dashboard';
import NewDashboard from '../pages/dashboard/NewDashboard';
import { PropertyList } from '../pages/properties/PropertyList';
import PropertyFormPage from '../pages/properties/PropertyFormPage';
import { PropertyDetail } from '../components/properties/PropertyDetail';
import { ContractList } from '../components/contracts/ContractList';
import { ContractForm } from '../components/contracts/ContractForm';
import { ContractDetail } from '../components/contracts/ContractDetail';
import { PaymentList } from '../components/payments/PaymentList';
import { PaymentForm } from '../components/payments/PaymentForm';
import { PaymentDetail } from '../components/payments/PaymentDetail';
import { MessageList } from '../components/messages/MessageList';
import { MessageForm } from '../components/messages/MessageForm';
import { MessageDetail } from '../components/messages/MessageDetail';
import { EmailVerification } from '../pages/auth/EmailVerification';
import { ResendVerification } from '../pages/auth/ResendVerification';
import { ReplyForm } from '../components/messages/ReplyForm';
import { RatingList } from '../components/ratings/RatingList';
import { RatingForm } from '../components/ratings/RatingForm';
import { RatingDetail } from '../components/ratings/RatingDetail';
import Settings from '../pages/settings/Settings';
import Resume from '../pages/Resume';
import ResumeEdit from '../pages/ResumeEdit';
import ServicesPage from '../pages/services/ServicesPage';
import ServiceRequestsPage from '../pages/services/ServiceRequestsPage';
import MessagesMain from '../pages/messages/MessagesMain';
import { useAuth } from '../hooks/useAuth';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import ServicesOverviewPage from '../pages/ServicesOverviewPage';
import SupportPage from '../pages/SupportPage';
import CommunityPage from '../pages/CommunityPage';
import Profile from '../pages/Profile';
import ConfirmEmail from '../pages/ConfirmEmail';
import ContractSigningDemo from '../pages/ContractSigningDemo';

export const AppRoutes: React.FC = () => {

const { isAuthenticated, isLoading } = useAuth();

// Si está cargando, mostrar loading
  if (isLoading) {

return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

// Si no está autenticado, mostrar solo rutas públicas
  if (!isAuthenticated) {

return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
        <Route path="/confirm-email/:key" element={<ConfirmEmail />} />
        <Route path="/forgot-password" element={<LandingPage />} />
        <Route path="/reset-password" element={<LandingPage />} />
        <Route path="/properties" element={<PropertyList />} />
        <Route path="/services" element={<ServicesOverviewPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/help" element={<SupportPage />} />
        <Route path="/blog" element={<CommunityPage />} />
        <Route path="/events" element={<CommunityPage />} />
        <Route path="/partners" element={<CommunityPage />} />
        <Route path="/careers" element={<CommunityPage />} />
        {/* Redirigir cualquier otra ruta a la landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  
  // Si está autenticado, mostrar rutas protegidas

return (
    <Routes>
      {/* Redirigir usuarios autenticados desde rutas públicas */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/reset-password" element={<Navigate to="/app/dashboard" replace />} />
      
      {/* Rutas protegidas - App principal */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        {/* Dashboard Route */}
        <Route path="dashboard" element={<NewDashboard />} />
        {/* Properties Routes */}
        <Route path="properties">
          <Route index element={<PropertyList />} />
          <Route path="new" element={<PropertyFormPage />} />
          <Route path=":id" element={<PropertyDetail />} />
          <Route path=":id/edit" element={<PropertyFormPage />} />
        </Route>
        {/* Contracts Routes */}
        <Route path="contracts">
          <Route index element={<ContractList />} />
          <Route path="new" element={<ContractForm />} />
          <Route path="signing-demo" element={<ContractSigningDemo />} />
          <Route path=":id" element={<ContractDetail />} />
          <Route path=":id/edit" element={<ContractForm />} />
        </Route>
        {/* Payments Routes */}
        <Route path="payments">
          <Route index element={<PaymentList />} />
          <Route path="new" element={<PaymentForm />} />
          <Route path=":id" element={<PaymentDetail />} />
          <Route path=":id/edit" element={<PaymentForm />} />
        </Route>
        {/* Messages Routes */}
        <Route path="messages">
          <Route index element={<MessagesMain />} />
          <Route path="new" element={<MessageForm />} />
          <Route path=":id" element={<MessageDetail />} />
          <Route path="reply" element={<ReplyForm />} />
        </Route>
        {/* Ratings Routes */}
        <Route path="ratings">
          <Route index element={<RatingList />} />
          <Route path="new" element={<RatingForm />} />
          <Route path=":id" element={<RatingDetail />} />
        </Route>
        {/* Profile Route */}
        <Route path="profile" element={<Profile />} />
        {/* Settings Route */}
        <Route path="settings" element={<Settings />} />
        {/* Resume Routes */}
        <Route path="resume" element={<Resume />} />
        <Route path="resume/edit" element={<ResumeEdit />} />
        {/* Services Routes */}
        <Route path="services" element={<ServicesOverviewPage />} />
        <Route path="service-requests" element={<ServiceRequestsPage />} />
        <Route path="help" element={<SupportPage />} />
        <Route path="blog" element={<CommunityPage />} />
        <Route path="events" element={<CommunityPage />} />
        <Route path="partners" element={<CommunityPage />} />
        <Route path="careers" element={<CommunityPage />} />
        {/* Catch all route para rutas protegidas */}
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>

      {/* Redirecciones para rutas legacy */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/properties" element={<Navigate to="/app/properties" replace />} />
      <Route path="/contracts" element={<Navigate to="/app/contracts" replace />} />
      <Route path="/payments" element={<Navigate to="/app/payments" replace />} />
      <Route path="/messages" element={<Navigate to="/app/messages" replace />} />
      <Route path="/ratings" element={<Navigate to="/app/ratings" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
      <Route path="/services" element={<Navigate to="/app/services" replace />} />

      {/* Catch all route para usuarios autenticados */}
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}; 