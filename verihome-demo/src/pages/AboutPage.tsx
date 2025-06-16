import React from 'react';
import { ShieldCheckIcon, HeartIcon, SparklesIcon, LightBulbIcon, UserGroupIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

export const AboutPage: React.FC = () => {
  const values = [
    {
      icon: ShieldCheckIcon,
      title: 'Seguridad',
      description: 'Implementamos los más altos estándares de seguridad en cada proceso, desde la verificación de usuarios hasta la protección de datos personales.'
    },
    {
      icon: HeartIcon,
      title: 'Confianza',
      description: 'Construimos relaciones duraderas basadas en la transparencia, honestidad y cumplimiento de nuestros compromisos con cada usuario.'
    },
    {
      icon: SparklesIcon,
      title: 'Innovación',
      description: 'Utilizamos tecnología de vanguardia para simplificar y mejorar continuamente la experiencia inmobiliaria de nuestros usuarios.'
    },
    {
      icon: LightBulbIcon,
      title: 'Transparencia',
      description: 'Proporcionamos información clara, completa y verificable en todas nuestras operaciones y comunicaciones.'
    },
    {
      icon: UserGroupIcon,
      title: 'Excelencia',
      description: 'Nos comprometemos a superar las expectativas en cada interacción, servicio y resultado que ofrecemos a nuestros usuarios.'
    },
    {
      icon: GlobeAltIcon,
      title: 'Comunidad',
      description: 'Fomentamos un ecosistema colaborativo donde todos los participantes se benefician y crecen juntos en el sector inmobiliario.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-4">
              Nosotros Somos <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">VeriHome</span>
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto">
              Revolucionando el mercado inmobiliario con tecnología, seguridad y confianza.
            </p>
          </div>
        </div>
      </div>

      {/* Mission and Vision */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-blue-50 rounded-2xl p-8">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <LightBulbIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Nuestra Misión</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Conectar de manera segura y eficiente a arrendadores, arrendatarios y prestadores de servicios 
                inmobiliarios, proporcionando una plataforma tecnológica revolucionaria que garantice transparencia, 
                confianza y excelencia en cada transacción.
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-2xl p-8">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <GlobeAltIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Nuestra Visión</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Ser la plataforma inmobiliaria líder en América Latina, reconocida por transformar la industria 
                mediante tecnología innovadora, procesos digitalizados y el más alto estándar de seguridad y 
                verificación de usuarios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Nuestros <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Valores</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Los principios que guían cada decisión y acción en VeriHome.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div key={index} className="bg-white rounded-xl p-8 shadow-lg text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            ¿Listo para formar parte de la revolución inmobiliaria?
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Únete a miles de usuarios que ya confían en VeriHome para sus necesidades inmobiliarias.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/registro"
              className="bg-yellow-500 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-400 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Comenzar Ahora
            </a>
            <a
              href="/contacto"
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Contáctanos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};