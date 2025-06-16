import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, ShieldCheckIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';

export const HomePage: React.FC = () => {
  const [searchLocation, setSearchLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [priceRange, setPriceRange] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // En una aplicación real, esto navegaría a la página de propiedades con filtros
    console.log('Búsqueda:', { searchLocation, propertyType, priceRange });
  };

  const stats = [
    { value: '10,000+', label: 'Propiedades' },
    { value: '50,000+', label: 'Usuarios' },
    { value: '98%', label: 'Satisfacción' },
    { value: '24/7', label: 'Soporte' },
  ];

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Seguridad Total',
      description: 'Verificación KYC y encriptación avanzada para proteger tus datos y transacciones.',
    },
    {
      icon: HeartIcon,
      title: 'Confianza',
      description: 'Sistema de calificaciones y reseñas para construir relaciones transparentes.',
    },
    {
      icon: SparklesIcon,
      title: 'Innovación',
      description: 'Tecnología de vanguardia para simplificar tu experiencia inmobiliaria.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              La Plataforma Inmobiliaria
              <br />
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                del Futuro
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto mb-12 leading-relaxed">
              Conectamos de manera segura a arrendadores, arrendatarios y prestadores de servicios 
              con tecnología revolucionaria y confianza garantizada.
            </p>

            {/* Search Form */}
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-2xl p-6 text-gray-900">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Ciudad, barrio..."
                    />
                  </div>
                  
                  <div className="md:col-span-1">
                    <label htmlFor="property-type" className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Propiedad
                    </label>
                    <select
                      id="property-type"
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="apartment">Apartamento</option>
                      <option value="house">Casa</option>
                      <option value="studio">Estudio</option>
                      <option value="condo">Condominio</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-1">
                    <label htmlFor="price-range" className="block text-sm font-medium text-gray-700 mb-2">
                      Rango de Precio
                    </label>
                    <select
                      id="price-range"
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="">Cualquier precio</option>
                      <option value="0-1000000">Hasta $1,000,000</option>
                      <option value="1000000-2000000">$1,000,000 - $2,000,000</option>
                      <option value="2000000-3000000">$2,000,000 - $3,000,000</option>
                      <option value="3000000+">Más de $3,000,000</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <MagnifyingGlassIcon className="w-5 h-5" />
                      <span>Buscar Propiedades</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Call to Action */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/propiedades"
                className="bg-yellow-500 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-400 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Explorar Propiedades
              </Link>
              <Link
                to="/servicios"
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Ver Servicios
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-yellow-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-300 text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">VeriHome</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nuestra plataforma revoluciona la experiencia inmobiliaria con tecnología avanzada y enfoque en la seguridad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group">
                  <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            ¿Listo para revolucionar tu experiencia inmobiliaria?
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Únete a miles de usuarios que ya confían en VeriHome para sus necesidades inmobiliarias.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/registro"
              className="bg-yellow-500 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-400 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Comenzar Ahora
            </Link>
            <Link
              to="/nosotros"
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Conocer Más
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};