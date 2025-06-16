import React from 'react';
import { WrenchScrewdriverIcon, PaintBrushIcon, BoltIcon, HomeIcon } from '@heroicons/react/24/outline';

export const ServicesPage: React.FC = () => {
  const services = [
    {
      id: 1,
      name: 'Carlos Mendoza',
      specialty: 'Plomería y Electricidad',
      rating: 4.9,
      price: 45000,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      verified: true,
      available: true,
      icon: WrenchScrewdriverIcon
    },
    {
      id: 2,
      name: 'Ana García',
      specialty: 'Pintura y Decoración',
      rating: 4.8,
      price: 35000,
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
      verified: true,
      available: false,
      icon: PaintBrushIcon
    },
    {
      id: 3,
      name: 'Roberto Silva',
      specialty: 'Instalaciones Eléctricas',
      rating: 5.0,
      price: 50000,
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      verified: true,
      available: true,
      icon: BoltIcon
    },
    {
      id: 4,
      name: 'María López',
      specialty: 'Remodelación Integral',
      rating: 4.7,
      price: 65000,
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      verified: true,
      available: true,
      icon: HomeIcon
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Prestadores de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Servicios</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Encuentra profesionales verificados para todos tus proyectos inmobiliarios.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 text-white">
                  <div className="flex items-center">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                    />
                    <div className="ml-4 flex-1">
                      <h3 className="text-xl font-semibold">{service.name}</h3>
                      <p className="text-blue-100 text-sm">{service.specialty}</p>
                    </div>
                    <Icon className="w-8 h-8 text-white/80" />
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">({service.rating})</span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      5 años experiencia
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className="text-lg font-bold text-gray-900">
                        ${service.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">/hora</span>
                    </div>
                    
                    <div className="flex items-center">
                      {service.available ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-green-600 font-medium text-sm">Disponible hoy</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                          <span className="text-yellow-600 font-medium text-sm">Próximamente</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200">
                      Ver Perfil
                    </button>
                    <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200">
                      Contactar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};