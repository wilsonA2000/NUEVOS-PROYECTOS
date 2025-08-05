import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  LazyLoadingSpinner, 
  SkeletonLoader, 
  useIntelligentPreload,
  preloadBasedOnRoute 
} from '../components/common/LazyComponents';

// Componentes cargados inmediatamente (críticos para UX)
import Layout from '../components/layout/Layout';
import LandingPage from '../pages/LandingPage';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';

// Lazy loading para componentes secundarios
const Dashboard = lazy(() => import('../pages/dashboard/NewDashboard'));
const PropertyList = lazy(() => import('../pages/properties/PropertyList').then(m => ({ default: m.PropertyList })));
const PropertyFormPage = lazy(() => import('../pages/properties/PropertyFormPage'));
const PropertyDetail = lazy(() => import('../components/properties/PropertyDetail').then(m => ({ default: m.PropertyDetail })));
const ContractList = lazy(() => import('../components/contracts/ContractList').then(m => ({ default: m.ContractList })));
const ContractForm = lazy(() => import('../components/contracts/ContractForm').then(m => ({ default: m.ContractForm })));
const ContractDetail = lazy(() => import('../components/contracts/ContractDetail').then(m => ({ default: m.ContractDetail })));
const PaymentList = lazy(() => import('../components/payments/PaymentList').then(m => ({ default: m.PaymentList })));
const PaymentForm = lazy(() => import('../components/payments/PaymentForm').then(m => ({ default: m.PaymentForm })));
const PaymentDetail = lazy(() => import('../components/payments/PaymentDetail').then(m => ({ default: m.PaymentDetail })));
const MessagesMain = lazy(() => import('../pages/messages/MessagesMain'));
const MessageForm = lazy(() => import('../components/messages/MessageForm').then(m => ({ default: m.MessageForm })));
const MessageDetail = lazy(() => import('../components/messages/MessageDetail').then(m => ({ default: m.MessageDetail })));
const ReplyForm = lazy(() => import('../components/messages/ReplyForm').then(m => ({ default: m.ReplyForm })));
const RatingList = lazy(() => import('../components/ratings/RatingList').then(m => ({ default: m.RatingList })));
const RatingForm = lazy(() => import('../components/ratings/RatingForm').then(m => ({ default: m.RatingForm })));
const RatingDetail = lazy(() => import('../components/ratings/RatingDetail').then(m => ({ default: m.RatingDetail })));
const Settings = lazy(() => import('../pages/settings/Settings'));
const Profile = lazy(() => import('../pages/Profile'));
const Resume = lazy(() => import('../pages/Resume'));
const ResumeEdit = lazy(() => import('../pages/ResumeEdit'));
const ServicesPage = lazy(() => import('../pages/services/ServicesPage'));
const ServiceRequestsPage = lazy(() => import('../pages/services/ServiceRequestsPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const ServicesOverviewPage = lazy(() => import('../pages/ServicesOverviewPage'));
const SupportPage = lazy(() => import('../pages/SupportPage'));
const CommunityPage = lazy(() => import('../pages/CommunityPage'));
const ConfirmEmail = lazy(() => import('../pages/ConfirmEmail'));

// Componentes de loading especializados
const PageLoader: React.FC = () => (
  <LazyLoadingSpinner 
    variant="page" 
    message="Cargando página..." 
  />
);

const DashboardLoader: React.FC = () => (
  <SkeletonLoader type="dashboard" animation="wave" />
);

const FormLoader: React.FC = () => (
  <SkeletonLoader type="form" animation="wave" />
);

const ListLoader: React.FC = () => (
  <SkeletonLoader type="list" count={5} animation="wave" />
);

const TableLoader: React.FC = () => (
  <SkeletonLoader type="table" count={10} animation="wave" />
);

// Wrapper para lazy loading con diferentes tipos de loaders
interface LazyRouteProps {
  children: React.ReactNode;
  type?: 'page' | 'dashboard' | 'form' | 'list' | 'table';
}

const LazyRoute: React.FC<LazyRouteProps> = ({ children, type = 'page' }) => {
  const loaders = {
    page: <PageLoader />,
    dashboard: <DashboardLoader />,
    form: <FormLoader />,
    list: <ListLoader />,
    table: <TableLoader />,
  };

  return (
    <Suspense fallback={loaders[type]}>
      {children}
    </Suspense>
  );
};

export const AppRoutes: React.FC = () => {

const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

// Preload inteligente basado en la ruta actual
  useIntelligentPreload(location.pathname);
  
  // Preload basado en la ruta cuando cambie
  useEffect(() => {
    preloadBasedOnRoute(location.pathname);
  }, [location.pathname]);
  
  // Si está cargando, mostrar loading
  if (isLoading) {
    return <PageLoader />;
  }
  
  // Si no está autenticado, mostrar solo rutas públicas
  if (!isAuthenticated) {

return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirm-email/:key" element={<LazyRoute><ConfirmEmail /></LazyRoute>} />
        <Route path="/forgot-password" element={<LandingPage />} />
        <Route path="/reset-password" element={<LandingPage />} />
        <Route path="/properties" element={<LazyRoute><PropertyList /></LazyRoute>} />
        <Route path="/services" element={<LazyRoute><ServicesOverviewPage /></LazyRoute>} />
        <Route path="/about" element={<LazyRoute><AboutPage /></LazyRoute>} />
        <Route path="/contact" element={<LazyRoute><ContactPage /></LazyRoute>} />
        <Route path="/help" element={<LazyRoute><SupportPage /></LazyRoute>} />
        <Route path="/blog" element={<LazyRoute><CommunityPage /></LazyRoute>} />
        <Route path="/events" element={<LazyRoute><CommunityPage /></LazyRoute>} />
        <Route path="/partners" element={<LazyRoute><CommunityPage /></LazyRoute>} />
        <Route path="/careers" element={<LazyRoute><CommunityPage /></LazyRoute>} />
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
        <Route path="dashboard" element={<LazyRoute type="dashboard"><Dashboard /></LazyRoute>} />
        {/* Properties Routes */}
        <Route path="properties">
          <Route index element={<LazyRoute type="list"><PropertyList /></LazyRoute>} />
          <Route path="new" element={<LazyRoute type="form"><PropertyFormPage /></LazyRoute>} />
          <Route path=":id" element={<LazyRoute type="page"><PropertyDetail /></LazyRoute>} />
          <Route path=":id/edit" element={<LazyRoute type="form"><PropertyFormPage /></LazyRoute>} />
        </Route>
        {/* Contracts Routes */}
        <Route path="contracts">
          <Route index element={<LazyRoute type="table"><ContractList /></LazyRoute>} />
          <Route path="new" element={<LazyRoute type="form"><ContractForm /></LazyRoute>} />
          <Route path=":id" element={<LazyRoute type="page"><ContractDetail /></LazyRoute>} />
          <Route path=":id/edit" element={<LazyRoute type="form"><ContractForm /></LazyRoute>} />
        </Route>
        {/* Payments Routes */}
        <Route path="payments">
          <Route index element={<LazyRoute type="table"><PaymentList /></LazyRoute>} />
          <Route path="new" element={<LazyRoute type="form"><PaymentForm /></LazyRoute>} />
          <Route path=":id" element={<LazyRoute type="page"><PaymentDetail /></LazyRoute>} />
          <Route path=":id/edit" element={<LazyRoute type="form"><PaymentForm /></LazyRoute>} />
        </Route>
        {/* Messages Routes */}
        <Route path="messages">
          <Route index element={<LazyRoute type="list"><MessagesMain /></LazyRoute>} />
          <Route path="new" element={<LazyRoute type="form"><MessageForm /></LazyRoute>} />
          <Route path=":id" element={<LazyRoute type="page"><MessageDetail /></LazyRoute>} />
          <Route path="reply" element={<LazyRoute type="form"><ReplyForm /></LazyRoute>} />
        </Route>
        {/* Ratings Routes */}
        <Route path="ratings">
          <Route index element={<LazyRoute type="table"><RatingList /></LazyRoute>} />
          <Route path="new" element={<LazyRoute type="form"><RatingForm /></LazyRoute>} />
          <Route path=":id" element={<LazyRoute type="page"><RatingDetail /></LazyRoute>} />
        </Route>
        {/* Profile Route */}
        <Route path="profile" element={<LazyRoute type="form"><Profile /></LazyRoute>} />
        {/* Settings Route */}
        <Route path="settings" element={<LazyRoute type="form"><Settings /></LazyRoute>} />
        {/* Resume Routes */}
        <Route path="resume" element={<LazyRoute type="page"><Resume /></LazyRoute>} />
        <Route path="resume/edit" element={<LazyRoute type="form"><ResumeEdit /></LazyRoute>} />
        {/* Services Routes */}
        <Route path="services" element={<LazyRoute><ServicesOverviewPage /></LazyRoute>} />
        <Route path="service-requests" element={<LazyRoute><ServiceRequestsPage /></LazyRoute>} />
        <Route path="help" element={<LazyRoute><SupportPage /></LazyRoute>} />
        <Route path="blog" element={<LazyRoute><CommunityPage /></LazyRoute>} />
        <Route path="events" element={<LazyRoute><CommunityPage /></LazyRoute>} />
        <Route path="partners" element={<LazyRoute><CommunityPage /></LazyRoute>} />
        <Route path="careers" element={<LazyRoute><CommunityPage /></LazyRoute>} />
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