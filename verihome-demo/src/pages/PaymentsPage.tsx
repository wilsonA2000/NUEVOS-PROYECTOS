import React, { useState } from 'react';
import { CreditCardIcon, BanknotesIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export const PaymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  const payments = [
    {
      id: 1,
      type: 'rent',
      amount: 2500000,
      concept: 'Renta Mensual - Apartamento Zona Rosa',
      property: 'Apartamento Moderno en Zona Rosa',
      from: 'Laura Rodríguez',
      to: 'Ana Silva',
      dueDate: '2024-12-15',
      status: 'completed',
      paidDate: '2024-12-14',
      paymentMethod: 'Transferencia Bancaria',
      escrowId: 'ESC-2024-001'
    },
    {
      id: 2,
      type: 'service',
      amount: 850000,
      concept: 'Reparación Sistema de Plomería',
      property: 'Casa Familiar en Chapinero',
      from: 'Roberto Díaz',
      to: 'Carlos Mendoza',
      dueDate: '2024-12-20',
      status: 'pending',
      paymentMethod: 'Escrow VeriHome',
      escrowId: 'ESC-2024-002'
    },
    {
      id: 3,
      type: 'deposit',
      amount: 5000000,
      concept: 'Depósito de Garantía - Estudio Centro',
      property: 'Estudio Ejecutivo Centro',
      from: 'Miguel Torres',
      to: 'Laura Rodríguez',
      dueDate: '2024-11-30',
      status: 'in_escrow',
      escrowDate: '2024-11-28',
      paymentMethod: 'Escrow VeriHome',
      escrowId: 'ESC-2024-003'
    },
    {
      id: 4,
      type: 'rent',
      amount: 1800000,
      concept: 'Renta Mensual - Estudio Centro',
      property: 'Estudio Ejecutivo Centro',
      from: 'Miguel Torres',
      to: 'Laura Rodríguez',
      dueDate: '2024-12-10',
      status: 'overdue',
      paymentMethod: 'Transferencia Bancaria'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_escrow': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircleIcon;
      case 'pending': return ClockIcon;
      case 'in_escrow': return BanknotesIcon;
      case 'overdue': return ExclamationTriangleIcon;
      default: return CreditCardIcon;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'pending': return 'Pendiente';
      case 'in_escrow': return 'En Escrow';
      case 'overdue': return 'Vencido';
      default: return 'Desconocido';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'rent': return 'Renta';
      case 'deposit': return 'Depósito';
      case 'service': return 'Servicio';
      default: return 'Otro';
    }
  };

  const filteredPayments = activeTab === 'all' 
    ? payments 
    : payments.filter(payment => payment.status === activeTab);

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Centro de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Pagos</span>
              </h1>
              <p className="text-gray-600">Gestiona todas tus transacciones de forma segura</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                ${totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                Total {activeTab === 'all' ? 'general' : getStatusLabel(activeTab).toLowerCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {payments.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completados</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {payments.filter(p => p.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pendientes</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {payments.filter(p => p.status === 'in_escrow').length}
                </div>
                <div className="text-sm text-gray-600">En Escrow</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {payments.filter(p => p.status === 'overdue').length}
                </div>
                <div className="text-sm text-gray-600">Vencidos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { key: 'all', label: 'Todos los Pagos', count: payments.length },
                { key: 'completed', label: 'Completados', count: payments.filter(p => p.status === 'completed').length },
                { key: 'pending', label: 'Pendientes', count: payments.filter(p => p.status === 'pending').length },
                { key: 'in_escrow', label: 'En Escrow', count: payments.filter(p => p.status === 'in_escrow').length },
                { key: 'overdue', label: 'Vencidos', count: payments.filter(p => p.status === 'overdue').length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Payments List */}
        <div className="space-y-6">
          {filteredPayments.map(payment => {
            const StatusIcon = getStatusIcon(payment.status);
            return (
              <div key={payment.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <StatusIcon className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full mr-3">
                          {getTypeLabel(payment.type)}
                        </span>
                        <h3 className="text-xl font-semibold text-gray-900">{payment.concept}</h3>
                      </div>
                      <p className="text-gray-600 mb-4">{payment.property}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">De:</span>
                          <p className="text-gray-900">{payment.from}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Para:</span>
                          <p className="text-gray-900">{payment.to}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Fecha límite:</span>
                          <p className="text-gray-900">{new Date(payment.dueDate).toLocaleDateString('es-ES')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Método de pago:</span>
                          <p className="text-gray-900">{payment.paymentMethod}</p>
                        </div>
                        {payment.escrowId && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">ID Escrow:</span>
                            <p className="text-gray-900 font-mono text-sm">{payment.escrowId}</p>
                          </div>
                        )}
                      </div>

                      {payment.paidDate && (
                        <div className="mt-4">
                          <span className="text-sm font-medium text-gray-500">Fecha de pago:</span>
                          <p className="text-gray-900">{new Date(payment.paidDate).toLocaleDateString('es-ES')}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col items-end">
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        ${payment.amount.toLocaleString()}
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {payment.status === 'pending' && (
                      <>
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200">
                          💳 Pagar Ahora
                        </button>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200">
                          🏦 Usar Escrow
                        </button>
                      </>
                    )}
                    
                    {payment.status === 'completed' && (
                      <button className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200">
                        📄 Descargar Recibo
                      </button>
                    )}
                    
                    {payment.status === 'in_escrow' && (
                      <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors duration-200">
                        🔓 Liberar Fondos
                      </button>
                    )}
                    
                    {payment.status === 'overdue' && (
                      <>
                        <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200">
                          ⚠️ Pago Urgente
                        </button>
                        <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200">
                          📞 Contactar
                        </button>
                      </>
                    )}
                    
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200">
                      👁️ Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-20">
            <CreditCardIcon className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No hay pagos {activeTab !== 'all' ? getStatusLabel(activeTab).toLowerCase() : ''}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {activeTab === 'all' 
                ? 'Cuando tengas transacciones, aparecerán aquí.'
                : `No tienes pagos ${getStatusLabel(activeTab).toLowerCase()} en este momento.`
              }
            </p>
          </div>
        )}

        {/* Security Features */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔒 Pagos Seguros con Tecnología Avanzada
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BanknotesIcon className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Sistema Escrow</h4>
              <p className="text-gray-600 text-sm">Fondos protegidos hasta completar servicios</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Verificación Dual</h4>
              <p className="text-gray-600 text-sm">Autenticación de dos factores en cada pago</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCardIcon className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Múltiples Métodos</h4>
              <p className="text-gray-600 text-sm">Tarjetas, transferencias y billeteras digitales</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};