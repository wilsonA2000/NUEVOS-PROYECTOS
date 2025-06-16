import React, { useState } from 'react';
import { DocumentTextIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export const ContractsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  const contracts = [
    {
      id: 1,
      title: 'Contrato de Arrendamiento - Apartamento Zona Rosa',
      property: 'Apartamento Moderno en Zona Rosa',
      tenant: 'Laura Rodríguez',
      landlord: 'Ana Silva',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2024-12-15',
      monthlyRent: 2500000,
      deposit: 5000000,
      signedDate: '2024-01-10',
      lastPayment: '2024-11-15'
    },
    {
      id: 2,
      title: 'Contrato de Servicios - Reparación Plomería',
      property: 'Casa Familiar en Chapinero',
      serviceProvider: 'Carlos Mendoza',
      landlord: 'Roberto Díaz',
      status: 'pending',
      startDate: '2024-12-20',
      estimatedCompletion: '2024-12-25',
      serviceValue: 850000,
      signedDate: null,
      description: 'Reparación integral del sistema de plomería'
    },
    {
      id: 3,
      title: 'Contrato de Arrendamiento - Estudio Centro',
      property: 'Estudio Ejecutivo Centro',
      tenant: 'Miguel Torres',
      landlord: 'Laura Rodríguez',
      status: 'expired',
      startDate: '2023-06-01',
      endDate: '2024-05-31',
      monthlyRent: 1800000,
      deposit: 3600000,
      signedDate: '2023-05-25',
      lastPayment: '2024-05-15'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircleIcon;
      case 'pending': return ClockIcon;
      case 'expired': return ExclamationTriangleIcon;
      default: return DocumentTextIcon;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'pending': return 'Pendiente';
      case 'expired': return 'Expirado';
      case 'draft': return 'Borrador';
      default: return 'Desconocido';
    }
  };

  const filteredContracts = activeTab === 'all' 
    ? contracts 
    : contracts.filter(contract => contract.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gestión de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Contratos</span>
              </h1>
              <p className="text-gray-600">Administra todos tus contratos digitales desde un solo lugar</p>
            </div>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5" />
              <span>Nuevo Contrato</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { key: 'all', label: 'Todos los Contratos', count: contracts.length },
                { key: 'active', label: 'Activos', count: contracts.filter(c => c.status === 'active').length },
                { key: 'pending', label: 'Pendientes', count: contracts.filter(c => c.status === 'pending').length },
                { key: 'expired', label: 'Expirados', count: contracts.filter(c => c.status === 'expired').length }
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

        {/* Contracts List */}
        <div className="space-y-6">
          {filteredContracts.map(contract => {
            const StatusIcon = getStatusIcon(contract.status);
            return (
              <div key={contract.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <StatusIcon className="w-5 h-5 text-gray-400 mr-2" />
                        <h3 className="text-xl font-semibold text-gray-900">{contract.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-4">{contract.property}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {contract.tenant && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Arrendatario:</span>
                            <p className="text-gray-900">{contract.tenant}</p>
                          </div>
                        )}
                        {contract.serviceProvider && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Prestador:</span>
                            <p className="text-gray-900">{contract.serviceProvider}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-500">Propietario:</span>
                          <p className="text-gray-900">{contract.landlord}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Fecha de inicio:</span>
                          <p className="text-gray-900">{new Date(contract.startDate).toLocaleDateString('es-ES')}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            {contract.endDate ? 'Fecha de fin:' : 'Finalización estimada:'}
                          </span>
                          <p className="text-gray-900">
                            {new Date(contract.endDate || contract.estimatedCompletion!).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Valor:</span>
                          <p className="text-gray-900 font-semibold">
                            ${(contract.monthlyRent || contract.serviceValue!).toLocaleString()}
                            {contract.monthlyRent && '/mes'}
                          </p>
                        </div>
                      </div>

                      {contract.description && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-500">Descripción:</span>
                          <p className="text-gray-900">{contract.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col items-end">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                      
                      {contract.signedDate && (
                        <p className="text-sm text-gray-500 mt-2">
                          Firmado: {new Date(contract.signedDate).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200">
                      Ver Detalles
                    </button>
                    
                    {contract.status === 'active' && (
                      <>
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200">
                          📄 Descargar PDF
                        </button>
                        <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200">
                          ✏️ Modificar
                        </button>
                      </>
                    )}
                    
                    {contract.status === 'pending' && (
                      <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors duration-200">
                        ✍️ Firmar Contrato
                      </button>
                    )}
                    
                    {contract.status === 'expired' && (
                      <button className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200">
                        🔄 Renovar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredContracts.length === 0 && (
          <div className="text-center py-20">
            <DocumentTextIcon className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No hay contratos {activeTab !== 'all' ? getStatusLabel(activeTab).toLowerCase() : ''}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {activeTab === 'all' 
                ? 'Comienza creando tu primer contrato digital en VeriHome.'
                : `No tienes contratos ${getStatusLabel(activeTab).toLowerCase()} en este momento.`
              }
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200">
              Crear Primer Contrato
            </button>
          </div>
        )}

        {/* Features Info */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ✨ Contratos Digitales Revolucionarios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Firma Digital Válida</h4>
              <p className="text-gray-600 text-sm">Contratos con validez legal y certificación digital</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Seguimiento Automático</h4>
              <p className="text-gray-600 text-sm">Notificaciones y recordatorios inteligentes</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Plantillas Inteligentes</h4>
              <p className="text-gray-600 text-sm">Generación automática según normativas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};