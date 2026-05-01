import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import {
  LazyLoadingSpinner,
  SkeletonLoader,
  useIntelligentPreload,
  preloadBasedOnRoute,
} from '../components/common/LazyComponents';

// Componentes cargados inmediatamente (críticos para UX)
import Layout from '../components/layout/Layout';
import LandingPage from '../pages/LandingPage';
import { Login } from '../pages/auth/Login';
import { RegisterWithCode } from '../pages/auth/RegisterWithCode';
import AdminProtectedRoute from '../components/auth/AdminProtectedRoute';

// Lazy loading para componentes secundarios
const Dashboard = lazy(() => import('../pages/dashboard/NewDashboard'));
const PropertyList = lazy(() =>
  import('../pages/properties/PropertyList').then(m => ({
    default: m.PropertyList,
  })),
);
const PropertyFormPage = lazy(
  () => import('../pages/properties/PropertyFormPage'),
);
const PropertyDetail = lazy(() =>
  import('../components/properties/PropertyDetail').then(m => ({
    default: m.PropertyDetail,
  })),
);
const ContractList = lazy(() =>
  import('../components/contracts/ContractList').then(m => ({
    default: m.ContractList,
  })),
);
const ContractForm = lazy(() =>
  import('../components/contracts/ContractForm').then(m => ({
    default: m.ContractForm,
  })),
);
const ContractDetail = lazy(() =>
  import('../components/contracts/ContractDetail').then(m => ({
    default: m.ContractDetail,
  })),
);
const PaymentList = lazy(() =>
  import('../components/payments/PaymentList').then(m => ({
    default: m.PaymentList,
  })),
);
const PaymentForm = lazy(() =>
  import('../components/payments/PaymentForm').then(m => ({
    default: m.PaymentForm,
  })),
);
const PaymentDetail = lazy(() =>
  import('../components/payments/PaymentDetail').then(m => ({
    default: m.PaymentDetail,
  })),
);
const PaymentDashboardPage = lazy(
  () => import('../pages/payments/PaymentDashboardPage'),
);
const MessagesMain = lazy(() => import('../pages/messages/MessagesMain'));
const MessageForm = lazy(() =>
  import('../components/messages/MessageForm').then(m => ({
    default: m.MessageForm,
  })),
);
const MessageDetail = lazy(() =>
  import('../components/messages/MessageDetail').then((m: any) => ({
    default: m.MessageDetail || m.default,
  })),
);
const ReplyForm = lazy(() =>
  import('../components/messages/ReplyForm').then(m => ({
    default: m.ReplyForm,
  })),
);
const RatingList = lazy(() =>
  import('../components/ratings/RatingList').then(m => ({
    default: m.RatingList,
  })),
);
const RatingForm = lazy(() =>
  import('../components/ratings/RatingForm').then((m: any) => ({
    default: m.RatingForm || m.default || (() => null),
  })),
);
const RatingDetail = lazy(() =>
  import('../components/ratings/RatingDetail').then(m => ({
    default: m.RatingDetail,
  })),
);
const Settings = lazy(() => import('../pages/settings/Settings'));
const Profile = lazy(() => import('../pages/profile/Profile'));
const Resume = lazy(() => import('../pages/Resume'));
const ResumeEdit = lazy(() => import('../pages/ResumeEdit'));
const ServicesPage = lazy(() => import('../pages/services/ServicesPage'));
const ServiceRequestsPage = lazy(
  () => import('../pages/services/ServiceRequestsPage'),
);
const MaintenancePage = lazy(
  () => import('../pages/maintenance/MaintenancePage'),
);
const AboutPage = lazy(() => import('../pages/AboutPage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const ServicesOverviewPage = lazy(
  () => import('../pages/ServicesOverviewPage'),
);
const SupportPage = lazy(() => import('../pages/SupportPage'));
const CommunityPage = lazy(() => import('../pages/CommunityPage'));
const ConfirmEmail = lazy(() => import('../pages/ConfirmEmail'));
const TermsPage = lazy(() => import('../pages/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));
const SecurityPage = lazy(() => import('../pages/SecurityPage'));
const SubscriptionPlans = lazy(
  () => import('../pages/subscriptions/SubscriptionPlans'),
);
const ContractSigningDemo = lazy(() => import('../pages/ContractSigningDemo'));
const RequestsPage = lazy(() => import('../pages/requests/RequestsPage'));
const MessengerMain = lazy(() => import('../pages/messages/MessengerMain'));
const EmailVerification = lazy(() =>
  import('../pages/auth/EmailVerification').then(m => ({
    default: m.EmailVerification,
  })),
);
const ResendVerification = lazy(() =>
  import('../pages/auth/ResendVerification').then(m => ({
    default: m.ResendVerification,
  })),
);
const ForgotPassword = lazy(() =>
  import('../pages/auth/ForgotPassword').then(m => ({
    default: m.ForgotPassword,
  })),
);
const ResetPassword = lazy(() =>
  import('../pages/auth/ResetPassword').then(m => ({
    default: m.ResetPassword,
  })),
);
const TenantInvitationLanding = lazy(
  () => import('../pages/contracts/TenantInvitationLanding'),
);

// Página pública de autenticación de codeudor (SIN login requerido)
const CodeudorAuthPage = lazy(() => import('../pages/public/CodeudorAuthPage'));

// VeriHome ID — onboarding digital previo a visita en campo
const VeriHomeIDOnboardingPage = lazy(
  () => import('../pages/verihome-id/VeriHomeIDOnboardingPage'),
);
const AgentVisitsQueue = lazy(
  () => import('../pages/agent/AgentVisitsQueue'),
);

// 🔐 ADMIN ROUTES (Plan Maestro V2.0)
const AdminLayout = lazy(() => import('../components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminContractsList = lazy(
  () => import('../pages/admin/AdminContractsList'),
);
const AdminContractReview = lazy(
  () => import('../pages/admin/AdminContractReview'),
);
const AdminAuditDashboard = lazy(
  () => import('../pages/admin/AdminAuditDashboard'),
);
const AdminSecurityPanel = lazy(
  () => import('../pages/admin/AdminSecurityPanel'),
);
const AdminLogsViewer = lazy(() => import('../pages/admin/AdminLogsViewer'));
const AdminAuditLog = lazy(() => import('../pages/admin/AdminAuditLog'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const AdminMaintenance = lazy(() => import('../pages/admin/AdminMaintenance'));
const AdminTicketsDashboard = lazy(
  () => import('../pages/admin/AdminTicketsDashboard'),
);
const AdminVerificationDashboard = lazy(
  () => import('../pages/admin/AdminVerificationDashboard'),
);
const AdminFieldVisitActs = lazy(
  () => import('../pages/admin/AdminFieldVisitActs'),
);
const AdminFieldVisitActDetail = lazy(
  () => import('../pages/admin/AdminFieldVisitActDetail'),
);
const AdminVerihomeIdScoring = lazy(
  () => import('../pages/admin/AdminVerihomeIdScoring'),
);

// Componentes de loading especializados
const PageLoader: React.FC = () => (
  <LazyLoadingSpinner variant='page' message='Cargando página...' />
);

const DashboardLoader: React.FC = () => (
  <SkeletonLoader type='dashboard' animation='wave' />
);

const FormLoader: React.FC = () => (
  <SkeletonLoader type='form' animation='wave' />
);

const ListLoader: React.FC = () => (
  <SkeletonLoader type='list' count={5} animation='wave' />
);

const TableLoader: React.FC = () => (
  <SkeletonLoader type='table' count={10} animation='wave' />
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

  return <Suspense fallback={loaders[type]}>{children}</Suspense>;
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
        <Route path='/' element={<LandingPage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<RegisterWithCode />} />
        <Route
          path='/email-verification'
          element={
            <LazyRoute>
              <EmailVerification />
            </LazyRoute>
          }
        />
        <Route
          path='/resend-verification'
          element={
            <LazyRoute>
              <ResendVerification />
            </LazyRoute>
          }
        />
        <Route
          path='/confirm-email/:key'
          element={
            <LazyRoute>
              <ConfirmEmail />
            </LazyRoute>
          }
        />
        <Route
          path='/forgot-password'
          element={
            <LazyRoute>
              <ForgotPassword />
            </LazyRoute>
          }
        />
        <Route
          path='/reset-password'
          element={
            <LazyRoute>
              <ResetPassword />
            </LazyRoute>
          }
        />
        <Route
          path='/properties'
          element={
            <LazyRoute>
              <PropertyList />
            </LazyRoute>
          }
        />
        <Route
          path='/services'
          element={
            <LazyRoute>
              <ServicesOverviewPage />
            </LazyRoute>
          }
        />
        <Route
          path='/about'
          element={
            <LazyRoute>
              <AboutPage />
            </LazyRoute>
          }
        />
        <Route
          path='/contact'
          element={
            <LazyRoute>
              <ContactPage />
            </LazyRoute>
          }
        />
        <Route
          path='/help'
          element={
            <LazyRoute>
              <SupportPage />
            </LazyRoute>
          }
        />
        <Route
          path='/terms'
          element={
            <LazyRoute>
              <TermsPage />
            </LazyRoute>
          }
        />
        <Route
          path='/privacy'
          element={
            <LazyRoute>
              <PrivacyPage />
            </LazyRoute>
          }
        />
        <Route
          path='/security'
          element={
            <LazyRoute>
              <SecurityPage />
            </LazyRoute>
          }
        />
        <Route
          path='/blog'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        <Route
          path='/events'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        <Route
          path='/partners'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        <Route
          path='/careers'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        {/* Ruta pública de invitación de arrendatario */}
        <Route
          path='/tenant/invitation/:token'
          element={
            <LazyRoute>
              <TenantInvitationLanding />
            </LazyRoute>
          }
        />
        {/* Ruta pública de autenticación de codeudor (SIN login) */}
        <Route
          path='/codeudor-auth/:token'
          element={
            <LazyRoute>
              <CodeudorAuthPage />
            </LazyRoute>
          }
        />
        {/* Redirigir cualquier otra ruta a la landing */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    );
  }

  // Si está autenticado, mostrar rutas protegidas

  return (
    <Routes>
      {/* Redirigir usuarios autenticados desde rutas públicas */}
      <Route path='/' element={<Navigate to='/app/dashboard' replace />} />
      <Route path='/login' element={<Navigate to='/app/dashboard' replace />} />
      <Route
        path='/register'
        element={<Navigate to='/app/dashboard' replace />}
      />
      <Route
        path='/forgot-password'
        element={<Navigate to='/app/dashboard' replace />}
      />
      <Route
        path='/reset-password'
        element={<Navigate to='/app/dashboard' replace />}
      />

      {/* Rutas protegidas - App principal */}
      <Route
        path='/app'
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to='/app/dashboard' replace />} />
        {/* Dashboard Route */}
        <Route
          path='dashboard'
          element={
            <LazyRoute type='dashboard'>
              <Dashboard />
            </LazyRoute>
          }
        />
        {/* Properties Routes */}
        <Route path='properties'>
          <Route
            index
            element={
              <LazyRoute type='list'>
                <PropertyList />
              </LazyRoute>
            }
          />
          <Route
            path='new'
            element={
              <LazyRoute type='form'>
                <PropertyFormPage />
              </LazyRoute>
            }
          />
          <Route
            path=':id'
            element={
              <LazyRoute type='page'>
                <PropertyDetail />
              </LazyRoute>
            }
          />
          <Route
            path=':id/edit'
            element={
              <LazyRoute type='form'>
                <PropertyFormPage />
              </LazyRoute>
            }
          />
        </Route>
        {/* Contracts Routes */}
        <Route path='contracts'>
          <Route
            index
            element={
              <LazyRoute type='table'>
                <ContractList />
              </LazyRoute>
            }
          />
          <Route
            path='new'
            element={
              <LazyRoute type='form'>
                <ContractForm />
              </LazyRoute>
            }
          />
          <Route
            path=':id'
            element={
              <LazyRoute type='page'>
                <ContractDetail />
              </LazyRoute>
            }
          />
          <Route
            path=':id/edit'
            element={
              <LazyRoute type='form'>
                <ContractForm />
              </LazyRoute>
            }
          />
        </Route>
        {/* Payments Routes — index ahora es el dashboard unificado T3.1.
            Las rutas legacy permanecen como /payments/transactions/* */}
        <Route path='payments'>
          <Route
            index
            element={
              <LazyRoute type='page'>
                <PaymentDashboardPage />
              </LazyRoute>
            }
          />
          <Route
            path='transactions'
            element={
              <LazyRoute type='table'>
                <PaymentList />
              </LazyRoute>
            }
          />
          <Route
            path='new'
            element={
              <LazyRoute type='form'>
                <PaymentForm />
              </LazyRoute>
            }
          />
          <Route
            path=':id'
            element={
              <LazyRoute type='page'>
                <PaymentDetail />
              </LazyRoute>
            }
          />
          <Route
            path=':id/edit'
            element={
              <LazyRoute type='form'>
                <PaymentForm />
              </LazyRoute>
            }
          />
        </Route>
        {/* Messages Routes */}
        <Route path='messages'>
          <Route
            index
            element={
              <LazyRoute type='list'>
                <MessagesMain />
              </LazyRoute>
            }
          />
          <Route
            path='new'
            element={
              <LazyRoute type='form'>
                <MessageForm />
              </LazyRoute>
            }
          />
          <Route
            path=':id'
            element={
              <LazyRoute type='page'>
                <MessageDetail />
              </LazyRoute>
            }
          />
          <Route
            path='reply'
            element={
              <LazyRoute type='form'>
                <ReplyForm />
              </LazyRoute>
            }
          />
        </Route>
        {/* Ratings Routes */}
        <Route path='ratings'>
          <Route
            index
            element={
              <LazyRoute type='table'>
                <RatingList />
              </LazyRoute>
            }
          />
          <Route
            path=':id'
            element={
              <LazyRoute type='page'>
                <RatingDetail />
              </LazyRoute>
            }
          />
        </Route>
        {/* Profile Route */}
        <Route
          path='profile'
          element={
            <LazyRoute type='form'>
              <Profile />
            </LazyRoute>
          }
        />
        {/* Settings Route */}
        <Route
          path='settings'
          element={
            <LazyRoute type='form'>
              <Settings />
            </LazyRoute>
          }
        />
        {/* Resume Routes */}
        <Route
          path='resume'
          element={
            <LazyRoute type='page'>
              <Resume />
            </LazyRoute>
          }
        />
        <Route
          path='resume/edit'
          element={
            <LazyRoute type='form'>
              <ResumeEdit />
            </LazyRoute>
          }
        />
        {/* Services Routes */}
        <Route
          path='services'
          element={
            <LazyRoute>
              <ServicesOverviewPage />
            </LazyRoute>
          }
        />
        <Route
          path='service-requests'
          element={
            <LazyRoute>
              <ServiceRequestsPage />
            </LazyRoute>
          }
        />
        {/* Maintenance Routes */}
        <Route
          path='maintenance'
          element={
            <LazyRoute type='list'>
              <MaintenancePage />
            </LazyRoute>
          }
        />
        {/* Requests Routes */}
        <Route
          path='requests'
          element={
            <LazyRoute type='list'>
              <RequestsPage />
            </LazyRoute>
          }
        />
        {/* Subscriptions */}
        <Route
          path='subscriptions'
          element={
            <LazyRoute>
              <SubscriptionPlans />
            </LazyRoute>
          }
        />
        {/* Contract Signing Demo */}
        <Route
          path='contracts/signing-demo'
          element={
            <LazyRoute>
              <ContractSigningDemo />
            </LazyRoute>
          }
        />
        <Route
          path='help'
          element={
            <LazyRoute>
              <SupportPage />
            </LazyRoute>
          }
        />
        <Route
          path='blog'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        <Route
          path='events'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        <Route
          path='partners'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        <Route
          path='careers'
          element={
            <LazyRoute>
              <CommunityPage />
            </LazyRoute>
          }
        />
        {/* VeriHome ID — onboarding digital pre-visita */}
        <Route
          path='verihome-id/onboarding'
          element={
            <LazyRoute type='form'>
              <VeriHomeIDOnboardingPage />
            </LazyRoute>
          }
        />
        {/* E5 · Cola de visitas del agente verificador */}
        <Route
          path='agente/visitas'
          element={
            <LazyRoute type='dashboard'>
              <AgentVisitsQueue />
            </LazyRoute>
          }
        />
        {/* Catch all route para rutas protegidas */}
        <Route path='*' element={<Navigate to='/app/dashboard' replace />} />
      </Route>

      {/* 🔐 RUTAS DE ADMINISTRACIÓN LEGAL (Plan Maestro V2.0) */}
      <Route
        path='/app/admin'
        element={
          <ProtectedRoute>
            <AdminProtectedRoute>
              <LazyRoute type='dashboard'>
                <AdminLayout />
              </LazyRoute>
            </AdminProtectedRoute>
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute type='dashboard'>
              <AdminDashboard />
            </LazyRoute>
          }
        />
        <Route
          path='contracts'
          element={
            <LazyRoute type='table'>
              <AdminContractsList />
            </LazyRoute>
          }
        />
        <Route
          path='contracts/:contractId'
          element={
            <LazyRoute type='page'>
              <AdminContractReview />
            </LazyRoute>
          }
        />
        <Route
          path='audit'
          element={
            <LazyRoute type='page'>
              <AdminAuditDashboard />
            </LazyRoute>
          }
        />
        <Route
          path='security'
          element={
            <LazyRoute type='page'>
              <AdminSecurityPanel />
            </LazyRoute>
          }
        />
        <Route
          path='logs'
          element={
            <LazyRoute type='table'>
              <AdminLogsViewer />
            </LazyRoute>
          }
        />
        <Route
          path='audit-logs'
          element={
            <LazyRoute type='table'>
              <AdminAuditLog />
            </LazyRoute>
          }
        />
        <Route
          path='settings'
          element={
            <LazyRoute type='form'>
              <AdminSettings />
            </LazyRoute>
          }
        />
        <Route
          path='maintenance'
          element={
            <LazyRoute type='list'>
              <AdminMaintenance />
            </LazyRoute>
          }
        />
        <Route
          path='tickets'
          element={
            <LazyRoute type='list'>
              <AdminTicketsDashboard />
            </LazyRoute>
          }
        />
        <Route
          path='verification'
          element={
            <LazyRoute type='list'>
              <AdminVerificationDashboard />
            </LazyRoute>
          }
        />
        {/* C11 · Actas VeriHome ID */}
        <Route
          path='visitas'
          element={
            <LazyRoute type='list'>
              <AdminFieldVisitActs />
            </LazyRoute>
          }
        />
        <Route
          path='visitas/:actId'
          element={
            <LazyRoute type='page'>
              <AdminFieldVisitActDetail />
            </LazyRoute>
          }
        />
        {/* C12 · Scoring VeriHome ID */}
        <Route
          path='verihome-id/scoring'
          element={
            <LazyRoute type='page'>
              <AdminVerihomeIdScoring />
            </LazyRoute>
          }
        />
      </Route>

      {/* Redirecciones para rutas legacy */}
      <Route
        path='/dashboard'
        element={<Navigate to='/app/dashboard' replace />}
      />
      <Route
        path='/properties'
        element={<Navigate to='/app/properties' replace />}
      />
      <Route
        path='/contracts'
        element={<Navigate to='/app/contracts' replace />}
      />
      <Route
        path='/payments'
        element={<Navigate to='/app/payments' replace />}
      />
      <Route
        path='/messages'
        element={<Navigate to='/app/messages' replace />}
      />
      <Route path='/ratings' element={<Navigate to='/app/ratings' replace />} />
      <Route
        path='/settings'
        element={<Navigate to='/app/settings' replace />}
      />
      <Route
        path='/services'
        element={<Navigate to='/app/services' replace />}
      />
      <Route
        path='/maintenance'
        element={<Navigate to='/app/maintenance' replace />}
      />

      {/* Ruta pública de autenticación de codeudor - accesible incluso para usuarios autenticados */}
      <Route
        path='/codeudor-auth/:token'
        element={
          <LazyRoute>
            <CodeudorAuthPage />
          </LazyRoute>
        }
      />

      {/* Catch all route para usuarios autenticados */}
      <Route path='*' element={<Navigate to='/app/dashboard' replace />} />
    </Routes>
  );
};
