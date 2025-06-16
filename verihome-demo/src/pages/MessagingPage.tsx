import React from 'react';

export const MessagingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Sistema de Mensajería</h1>
          <p className="text-gray-600 mb-8">Comunicación segura tipo Gmail entre usuarios verificados</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-4">Bandeja de Entrada</h3>
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="font-medium text-sm">📥 Bandeja de Entrada</p>
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">3</span>
                </div>
                <div className="p-3 hover:bg-gray-100 rounded-lg">
                  <p className="text-sm">📤 Enviados</p>
                </div>
                <div className="p-3 hover:bg-gray-100 rounded-lg">
                  <p className="text-sm">📋 Borradores</p>
                </div>
                <div className="p-3 hover:bg-gray-100 rounded-lg">
                  <p className="text-sm">🗂️ Archivados</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Mensajes Recientes</h3>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                      ✏️ Nuevo Mensaje
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  <div className="p-4 hover:bg-gray-50 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          AS
                        </div>
                        <div>
                          <p className="font-semibold">Ana Silva (Arrendadora)</p>
                          <p className="text-sm text-gray-600">Documentos del contrato</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-3 h-3 bg-yellow-600 rounded-full" title="No leído"></div>
                        <span className="text-xs text-gray-500">10:30 AM</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 hover:bg-gray-50 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                          CM
                        </div>
                        <div>
                          <p className="font-semibold">Carlos Mendoza (Prestador)</p>
                          <p className="text-sm text-gray-600">Cotización de reparación</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-3 h-3 bg-green-500 rounded-full" title="Leído"></div>
                        <span className="text-xs text-gray-500">Ayer 3:45 PM</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 hover:bg-gray-50 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-semibold">
                          LR
                        </div>
                        <div>
                          <p className="font-semibold">Laura Rodríguez (Arrendataria)</p>
                          <p className="text-sm text-gray-600">Confirmación de pago</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-3 h-3 bg-green-500 rounded-full" title="Leído"></div>
                        <span className="text-xs text-gray-500">Hace 2 días</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">🔒 Comunicación Segura</h4>
                <p className="text-blue-800 text-sm">
                  Solo puedes enviar mensajes a usuarios con relación contractual establecida. 
                  Todos los mensajes están encriptados y monitoreados para tu seguridad.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};