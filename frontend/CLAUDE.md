# Claude Code - VeriHome Project Context

## Project Overview
VeriHome is a comprehensive real estate platform built with Django REST Framework backend and React TypeScript frontend. This document contains important context and configurations for Claude Code sessions.

## Environment Configuration

### API Configuration
- Backend API URL: `http://localhost:8000/api/v1`
- Frontend Dev Server: `http://localhost:5173`

### Mapbox Configuration
```bash
# Environment Variables (.env)
VITE_MAPBOX_TOKEN=pk.eyJ1Ijoid2lsc29uYXJndWVsbG8yMDI1IiwiYSI6ImNtYm1zcmg1aDE0NTkyam9rZDRkNzF5YWoifQ.FgvTtKt3AK5uxcoz8BHtmw
VITE_DEFAULT_COUNTRY=CO
VITE_DEFAULT_LAT=4.5709
VITE_DEFAULT_LNG=-74.2973
VITE_DEFAULT_ZOOM=6
```

## Build & Test Commands

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Testing Commands
```bash
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Type Checking
```bash
npx tsc --noEmit     # Type check without compilation
```

## Project Architecture

### Properties Module Structure
- **Frontend**: `/src/components/properties/`
  - `PropertyList.tsx` - Main listing with responsive table/card views
  - `PropertyForm.tsx` - Create/edit form with validations
  - `PropertyDetail.tsx` - Property details view
  - `ContactLandlord.tsx` - Contact form component

- **Backend Integration**: `/src/services/propertyService.ts`
  - Full CRUD operations
  - File upload handling
  - Search and filtering

### Key Type Definitions
- **Property Interface**: `/src/types/property.ts`
  - UUID-based IDs (`id: string`)
  - Comprehensive property attributes
  - Landlord, images, and amenities relations

## Important Implementation Details

### File Validation System
Located in `PropertyForm.tsx`:
```typescript
const FILE_VALIDATION = {
  images: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxCount: 10,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  },
  videos: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime']
  }
};
```

### Performance Monitoring
- **Utility**: `/src/utils/performanceMonitor.ts`
- Tracks API response times, component render times
- Automatically logs slow operations (>100ms)
- Integrated with axios interceptors

### Responsive Design
- **Desktop**: Data table with full features
- **Mobile**: Card-based layout with essential info
- Breakpoint: Material-UI `md` (≥960px)

## Testing Setup

### Test Configuration
- **Framework**: Jest with TypeScript support
- **Environment**: jsdom for React component testing
- **Coverage**: Configured for `/src` directory

### Test Files
- `/src/hooks/__tests__/useProperties.test.ts` - Updated with modern Property types
- `/src/components/properties/__tests__/PropertyForm.validation.test.ts` - File validation tests

## Recent Fixes & Improvements

### Completed Solutions (8/8):
1. ✅ **Consolidar Servicios API** - Removed duplicate `properties.ts` service
2. ✅ **Tipos y Consistencia** - Updated Property types with UUID IDs
3. ✅ **Configuración Mapbox** - Environment variables setup
4. ✅ **Gestión de Imágenes** - PropertyImage component with fallbacks
5. ✅ **Optimizar Responsividad** - Dual table/card responsive design
6. ✅ **Validaciones y Seguridad** - Comprehensive file validation system
7. ✅ **Testing y Verificación** - Updated tests for modern Property types
8. ✅ **Monitoreo y Optimización** - Performance monitoring system

### Key Files Modified:
- `src/services/properties.ts` → **REMOVED** (consolidated into propertyService.ts)
- `src/components/properties/PropertyForm.tsx` → Enhanced with file validation
- `src/components/properties/PropertyList.tsx` → Added responsive design + performance tracking
- `src/components/common/PropertyImage.tsx` → **CREATED** for image management
- `.env` → **CREATED** with Mapbox configuration
- `src/utils/performanceMonitor.ts` → **CREATED** for performance tracking
- `package.json` → Added test scripts and dependencies

## Performance Monitoring Features

### API Performance Tracking
- Request/response time monitoring
- Slow API call detection (>1s warning, >2s critical)
- Error tracking with status codes

### Component Performance
- Render time tracking per component
- Slow render detection (>16ms for 60fps)
- Average/min/max render statistics

### Usage
```typescript
import { usePerformanceTracking } from '../utils/performanceMonitor';

const { trackRender, startOperation, endOperation } = usePerformanceTracking('ComponentName');
```

## Authentication Context
- JWT-based authentication with automatic token handling
- Token refresh mechanism
- Automatic logout on token expiration
- Role-based access control (landlord, tenant, service_provider)

## Known Issues & Considerations
- Some TypeScript errors exist in other modules (not properties-related)
- MSW (Mock Service Worker) configuration temporarily disabled in tests
- Performance monitoring is development-only (production disabled)

## Future Improvements
- Complete MSW setup for comprehensive API mocking
- Add image optimization and lazy loading
- Implement virtual scrolling for large property lists
- Add property comparison feature
- Enhanced search with geolocation filtering

---

*Last updated: Implementation of 8 comprehensive solutions for VeriHome properties module*