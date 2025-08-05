# VeriHome Frontend

Una aplicación web moderna para la gestión inmobiliaria construida con React, TypeScript y Material-UI.

## 🚀 Características

- **Dashboard Interactivo**: Vista general con estadísticas y acciones rápidas
- **Gestión de Propiedades**: CRUD completo para propiedades inmobiliarias
- **Contratos**: Gestión de contratos de arrendamiento
- **Pagos**: Seguimiento de pagos y cobros
- **Mensajería**: Sistema de comunicación entre usuarios
- **Servicios**: Gestión de servicios y solicitudes
- **Diseño Responsivo**: Optimizado para móviles y escritorio
- **Tema Personalizado**: Material-UI con paleta de colores profesional

## 🛠️ Tecnologías

- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático
- **Material-UI (MUI)** - Componentes de UI
- **React Router** - Enrutamiento
- **React Query** - Gestión de estado del servidor
- **React Hook Form** - Formularios
- **Axios** - Cliente HTTP
- **Vite** - Build tool

## 📦 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   
   Editar `.env.local`:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── auth/           # Componentes de autenticación
│   ├── contracts/      # Componentes de contratos
│   ├── dashboard/      # Componentes del dashboard
│   ├── layout/         # Componentes de layout
│   ├── messages/       # Componentes de mensajería
│   ├── payments/       # Componentes de pagos
│   └── properties/     # Componentes de propiedades
├── hooks/              # Custom hooks
├── pages/              # Páginas de la aplicación
├── routes/             # Configuración de rutas
├── services/           # Servicios de API
├── theme/              # Configuración del tema
├── types/              # Definiciones de tipos TypeScript
└── utils/              # Utilidades
```

## 🎨 Tema y Estilo

La aplicación utiliza Material-UI con un tema personalizado que incluye:

- **Paleta de colores profesional** para el sector inmobiliario
- **Tipografía optimizada** para legibilidad
- **Componentes consistentes** en toda la aplicación
- **Modo responsivo** para diferentes tamaños de pantalla

## 🔐 Autenticación

El sistema de autenticación incluye:

- **Login/Registro** de usuarios
- **Protección de rutas** con `ProtectedRoute`
- **Gestión de tokens** JWT
- **Diferentes roles**: owner, tenant, service_provider

## 📱 Funcionalidades por Rol

### Owner (Arrendador)
- Gestión de propiedades
- Ver contratos activos
- Seguimiento de pagos
- Comunicación con inquilinos

### Tenant (Inquilino)
- Ver propiedades disponibles
- Gestionar contratos
- Realizar pagos
- Solicitar servicios

### Service Provider (Prestador de Servicios)
- Ver solicitudes de servicio
- Gestionar perfil
- Comunicación con clientes

## 🚀 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Construir para producción
npm run preview      # Previsualizar build de producción
npm run lint         # Ejecutar linter
npm run test         # Ejecutar tests
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=VeriHome
VITE_APP_VERSION=1.0.0
```

### Proxy de Desarrollo

El servidor de desarrollo está configurado para hacer proxy de las llamadas API al backend Django en `http://localhost:8000`.

## 📊 Componentes Principales

### Dashboard
- Estadísticas en tiempo real
- Acciones rápidas
- Actividad reciente
- Gráficos de ingresos y ocupación

### PropertyList
- DataGrid con filtros avanzados
- Búsqueda y ordenamiento
- Acciones en lote
- Paginación

### ContractForm
- Formulario con validación
- React Hook Form
- Campos dinámicos
- Subida de archivos

## 🧪 Testing

```bash
npm run test          # Ejecutar tests
npm run test:watch    # Modo watch
npm run test:coverage # Con cobertura
```

## 📦 Build y Despliegue

### Build de Producción
```bash
npm run build
```

### Despliegue con Docker
```bash
docker build -t verihome-frontend .
docker run -p 3000:3000 verihome-frontend
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:

- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación del backend

## 🔄 Actualizaciones

Para mantener el proyecto actualizado:

```bash
npm update
npm audit fix
```

---

**VeriHome** - Plataforma de gestión inmobiliaria moderna y eficiente. 