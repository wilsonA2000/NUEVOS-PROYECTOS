import React from 'react';
import { HomeIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, CreditCardIcon } from '@heroicons/react/24/outline';

interface DashboardPageProps {
  userType: 'landlord' | 'tenant' | 'service_provider' | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ userType }) => {
  const getUserTypeLabel = () => {
    switch (userType) {
      case 'landlord': return 'Arrendador';
      case 'tenant': return 'Arrendatario';
      case 'service_provider': return 'Prestador de Servicios';
      default: return 'Usuario';
    }
  };

  const quickActions = [
    { icon: HomeIcon, label: 'Propiedades', href: '/propiedades', color: 'bg-blue-500' },
    { icon: ChatBubbleLeftRightIcon, label: 'Mensajes', href: '/mensajes', color: 'bg-green-500' },
    { icon: DocumentTextIcon, label: 'Contratos', href: '/contratos', color: 'bg-purple-500' },
    { icon: CreditCardIcon, label: 'Pagos', href: '/pagos', color: 'bg-orange-500' },
  ];

  const stats = userType === 'landlord' ? [
    { label: 'Propiedades', value: '12' },
    { label: 'Contratos Activos', value: '8' },
    { label: 'Ingresos del Mes', value: '$45M' },
    { label: 'Ocupación', value: '92%' },
  ] : userType === 'service_provider' ? [
    { label: 'Servicios Activos', value: '15' },
    { label: 'Clientes', value: '28' },
    { label: 'Ingresos del Mes', value: '$12M' },
    { label: 'Calificación', value: '4.9★' },
  ] : [
    { label: 'Propiedades Favoritas', value: '5' },
    { label: 'Solicitudes', value: '3' },
    { label: 'Contratos', value: '1' },
    { label: 'Mensajes', value: '12' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bienvenido, <span className="text-blue-600">{getUserTypeLabel()}</span>
              </h1>
              <p className="text-gray-600 mt-2">Gestiona tu actividad en VeriHome desde aquí</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <HomeIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <a
                  key={index}
                  href={action.href}
                  className="flex flex-col items-center p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900">{action.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Actividad Reciente</h3>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium">Nuevo mensaje recibido</p>
                  <p className="text-sm text-gray-600">Hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium">Pago procesado exitosamente</p>
                  <p className="text-sm text-gray-600">Hace 1 día</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-medium">Contrato firmado</p>
                  <p className="text-sm text-gray-600">Hace 3 días</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Próximas Tareas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">Revisar contrato pendiente</p>
                  <p className="text-sm text-gray-600">Vence mañana</p>
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pendiente</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">Pago de renta programado</p>
                  <p className="text-sm text-gray-600">En 3 días</p>
                </div>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Programado</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">Inspección de propiedad</p>
                  <p className="text-sm text-gray-600">Próxima semana</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Confirmado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};