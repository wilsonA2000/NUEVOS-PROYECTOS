import React, { useState } from 'react';
import { MagnifyingGlassIcon, MapPinIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface Property {
  id: number;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  type: string;
  featured: boolean;
  verified: boolean;
  rating: number;
  landlord: string;
}

export const PropertiesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Datos de ejemplo
  const properties: Property[] = [
    {
      id: 1,
      title: 'Apartamento Moderno en Zona Rosa',
      price: 2500000,
      location: 'Zona Rosa, Bogotá',
      bedrooms: 2,
      bathrooms: 2,
      area: 85,
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500',
      type: 'Apartamento',
      featured: true,
      verified: true,
      rating: 4.8,
      landlord: 'Ana Silva'
    },
    {
      id: 2,
      title: 'Casa Familiar en Chapinero',
      price: 4200000,
      location: 'Chapinero, Bogotá',
      bedrooms: 3,
      bathrooms: 3,
      area: 150,
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
      type: 'Casa',
      featured: false,
      verified: true,
      rating: 4.9,
      landlord: 'Carlos Mendoza'
    },
    {
      id: 3,
      title: 'Estudio Ejecutivo Centro',
      price: 1800000,
      location: 'Centro, Bogotá',
      bedrooms: 1,
      bathrooms: 1,
      area: 45,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
      type: 'Estudio',
      featured: false,
      verified: true,
      rating: 4.6,
      landlord: 'Laura Rodríguez'
    },
    {
      id: 4,
      title: 'Penthouse de Lujo Rosales',
      price: 8500000,
      location: 'Rosales, Bogotá',
      bedrooms: 4,
      bathrooms: 4,
      area: 250,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500',
      type: 'Penthouse',
      featured: true,
      verified: true,
      rating: 5.0,
      landlord: 'Miguel Torres'
    },
    {
      id: 5,
      title: 'Apartaestudio Estudiantes',
      price: 1200000,
      location: 'La Candelaria, Bogotá',
      bedrooms: 1,
      bathrooms: 1,
      area: 35,
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
      type: 'Apartaestudio',
      featured: false,
      verified: false,
      rating: 4.2,
      landlord: 'Sofia García'
    },
    {
      id: 6,
      title: 'Casa Campestre Chia',
      price: 3800000,
      location: 'Chía, Cundinamarca',
      bedrooms: 4,
      bathrooms: 3,
      area: 200,
      image: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=500',
      type: 'Casa',
      featured: false,
      verified: true,
      rating: 4.7,
      landlord: 'Roberto Díaz'
    }
  ];

  const toggleFavorite = (id: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !propertyType || property.type === propertyType;
    const matchesMinPrice = !minPrice || property.price >= parseInt(minPrice);
    const matchesMaxPrice = !maxPrice || property.price <= parseInt(maxPrice);
    
    return matchesSearch && matchesType && matchesMinPrice && matchesMaxPrice;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Encuentra tu <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Hogar Ideal</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explora nuestra selección de propiedades verificadas y encuentra el lugar perfecto para ti.
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Búsqueda
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Ubicación, título..."
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  id="type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Estudio">Estudio</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Apartaestudio">Apartaestudio</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="min-price" className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Mín.
                </label>
                <input
                  type="number"
                  id="min-price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="$0"
                />
              </div>
              
              <div>
                <label htmlFor="max-price" className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Máx.
                </label>
                <input
                  type="number"
                  id="max-price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Sin límite"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {}}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <span className="text-sm font-medium text-gray-700">Filtros rápidos:</span>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
              Amueblado
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
              Permite mascotas
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
              Estacionamiento
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
              Balcón/Terraza
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{filteredProperties.length} propiedades encontradas</span>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Ordenar por: Más recientes</option>
              <option>Precio: Menor a mayor</option>
              <option>Precio: Mayor a menor</option>
              <option>Mejor calificadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map((property) => (
              <div key={property.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {property.featured && (
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        Destacada
                      </span>
                    )}
                    {property.verified && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        Verificada
                      </span>
                    )}
                  </div>
                  
                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(property.id)}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all duration-200"
                  >
                    {favorites.has(property.id) ? (
                      <HeartSolidIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      <HeartIcon className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" />
                    )}
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {property.title}
                    </h3>
                    <span className="text-2xl font-bold text-blue-600">
                      ${property.price.toLocaleString()}
                      <span className="text-sm font-normal text-gray-500">/mes</span>
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    {property.location}
                  </p>
                  
                  {/* Features */}
                  <div className="flex items-center gap-6 mb-4 text-gray-600">
                    <div className="flex items-center">
                      <span className="text-sm">{property.bedrooms} hab.</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm">{property.bathrooms} baños</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm">{property.area}m²</span>
                    </div>
                  </div>
                  
                  {/* Rating and Landlord */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">({property.rating})</span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Por {property.landlord}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <EyeIcon className="w-4 h-4" />
                      <span>Ver Detalles</span>
                    </button>
                    <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200">
                      Contactar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No se encontraron propiedades</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              No hay propiedades que coincidan con tus criterios de búsqueda. 
              Intenta ajustar los filtros o ampliar tu búsqueda.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setPropertyType('');
                setMinPrice('');
                setMaxPrice('');
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};