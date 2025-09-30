# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
VeriHome is an enterprise-grade real estate platform connecting landlords, tenants, and service providers in Colombia. Built with Django REST Framework backend and React TypeScript frontend, featuring revolutionary biometric contract authentication and real-time messaging.

---

## Development Commands

### Backend (Django)
```bash
# Environment Setup
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Database
python manage.py migrate
python manage.py createsuperuser

# Run Server
python manage.py runserver              # Development server (port 8000)
python3 manage.py runserver             # Alternative for Linux
python manage.py shell                  # Django shell for debugging

# Management Commands
python manage.py makemigrations         # Create new migrations
python manage.py showmigrations         # Show migration status
python manage.py collectstatic          # Collect static files
```

### Frontend (React + Vite)
```bash
cd frontend

# Install Dependencies
npm install

# Development
npm run dev                    # Start dev server (http://localhost:5173)
npm run preview                # Preview production build

# Building
npm run build                  # Production build
npm run build:prod             # Production build with type checking
npm run build:analyze          # Build with bundle analysis

# Code Quality
npm run lint                   # Run ESLint
npm run lint:fix               # Fix linting issues
npm run format                 # Format code with Prettier
npm run format:check           # Check code formatting
npm run type-check             # TypeScript type checking (no compilation)

# Testing
npm test                       # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Generate coverage report
npm run test:unit              # Run unit tests only
npm run test:integration       # Run integration tests
npm run test:components        # Test components only
npm run test:hooks             # Test hooks only
npm run test:services          # Test services only
npm run test:ci                # CI-optimized test run

# Performance
npm run size-check             # Check bundle sizes
```

### Database Management
The project uses a flexible database system with PostgreSQL primary and SQLite fallback:
```bash
# Database config is in scripts/database/database_config.py
# Connection validation happens automatically on startup
# SQLite fallback activates if PostgreSQL unavailable
```

---

## Architecture Overview

### Technology Stack
- **Backend**: Django 4.2.7 + Django REST Framework 3.14.0
- **Frontend**: React 18 + TypeScript 5 + Vite 5 + Material-UI 5
- **Database**: PostgreSQL (with SQLite fallback)
- **Cache**: Redis (with local memory fallback)
- **WebSocket**: Django Channels 4.2.2 + channels-redis
- **Task Queue**: Celery 5.3.4 with Redis broker
- **Authentication**: JWT (Simple-JWT) + Django Allauth

### Django Apps Structure
```
verihome/                   # Main project configuration
├── settings.py            # Comprehensive settings with Redis/cache fallback
├── urls.py                # URL routing with API v1 namespace
└── asgi.py                # ASGI config for WebSocket support

core/                      # Core functionality
├── middleware.py          # Security, rate limiting, performance monitoring
├── cache.py               # Multi-level caching utilities
└── audit_service.py       # Comprehensive audit logging

users/                     # User management & authentication
├── models/
│   ├── user.py           # Custom user model (email-based auth)
│   └── interview.py      # Interview code system for registration
├── api_views.py          # JWT authentication endpoints
└── adapters.py           # Custom Allauth adapters

properties/               # Property management
├── models.py            # Property model with amenities & media
├── api_views.py         # CRUD endpoints with filtering
├── optimized_views.py   # Performance-optimized property queries
└── serializers.py       # Property serialization with relations

contracts/               # Revolutionary biometric contract system
├── models.py           # Contract, LandlordControlledContract
├── biometric_service.py # 5-step biometric verification
├── pdf_generator.py    # Professional PDF with notarial design
├── clause_manager.py   # Dynamic contract clauses (Colombian law)
├── api_views.py        # Contract CRUD
├── landlord_api_views.py    # Landlord-specific contract APIs
└── tenant_api_views.py      # Tenant-specific contract APIs

matching/               # AI-powered tenant-landlord matching
├── models.py          # MatchRequest with workflow states
├── services.py        # Matching algorithm with ML
└── contract_integration.py # Contract workflow integration

messaging/              # Real-time messaging system
├── models.py          # Message, Thread models
├── consumers.py       # WebSocket consumers (4 types)
├── routing.py         # WebSocket URL routing
└── notifications.py   # Push notification integration

payments/              # Payment processing
├── models.py         # Transaction, Payment models
└── escrow_integration.py # Escrow account management

ratings/               # Rating & reputation system
├── models.py         # Rating model with multi-role support
└── advanced_views.py # Reputation analytics

requests/              # Document request system
├── models.py         # DocumentRequest with verification
└── document_api_views.py # Document upload/review APIs

services/              # Service provider marketplace
└── models.py         # Service listings

dashboard/             # Analytics dashboard
├── services.py       # Dashboard data aggregation
└── api_views.py      # Dashboard widget APIs (25+ types)
```

### Frontend Architecture
```
frontend/src/
├── components/
│   ├── contracts/
│   │   ├── BiometricAuthenticationFlow.tsx    # 5-step orchestration
│   │   ├── CameraCapture.tsx                  # Facial recognition
│   │   ├── DocumentVerification.tsx           # Colombian ID OCR
│   │   ├── VoiceRecorder.tsx                  # Voice biometrics
│   │   ├── DigitalSignaturePad.tsx            # Digital signature
│   │   ├── LandlordContractForm.tsx           # Multi-step contract creation
│   │   ├── TenantContractsDashboard.tsx       # Tenant contract management
│   │   └── MatchedCandidatesView.tsx          # Landlord candidate management
│   ├── properties/
│   │   ├── PropertyList.tsx                   # Responsive table/card view
│   │   ├── PropertyForm.tsx                   # Create/edit with validation
│   │   ├── PropertyImageUpload.tsx            # Drag-drop with compression
│   │   └── PropertyDetail.tsx                 # Property detail view
│   ├── matching/
│   │   ├── MatchesDashboard.tsx              # Match request management
│   │   └── MatchRequestForm.tsx              # Submit match request
│   ├── messaging/
│   │   └── MessagesMain.tsx                  # Real-time chat interface
│   └── common/
│       ├── ErrorBoundaries.tsx               # Error boundary components
│       └── LoadingSpinner.tsx                # Loading states
├── services/
│   ├── api.ts                    # Axios instance with interceptors
│   ├── authService.ts            # JWT authentication
│   ├── propertyService.ts        # Property CRUD
│   ├── contractService.ts        # Contract + biometric APIs
│   ├── landlordContractService.ts # Landlord contract operations
│   ├── matchingService.ts        # Match request operations
│   ├── messageService.ts         # Messaging APIs
│   └── websocketService.ts       # WebSocket management
├── hooks/
│   ├── useProperties.ts          # Property data fetching
│   ├── useContracts.ts           # Contract data management
│   ├── useWebSocket.ts           # WebSocket connection
│   └── useOptimizedQueries.ts    # Performance-optimized queries
├── contexts/
│   ├── AuthContext.tsx           # Global auth state
│   └── NotificationContext.tsx   # Real-time notifications
├── types/
│   ├── user.ts                   # User interfaces
│   ├── property.ts               # Property interfaces
│   ├── contract.ts               # Contract + biometric interfaces
│   └── landlordContract.ts       # Landlord contract types
└── utils/
    ├── performanceMonitor.ts     # API/render performance tracking
    ├── imageOptimization.ts      # Image compression utilities
    └── auditMiddleware.ts        # Audit trail integration
```

---

## Critical Implementation Details

### Authentication System
- **Email-based authentication** (no username required)
- **JWT tokens**: Access token (1 day) + Refresh token (7 days)
- **Interview code system**: Users register with time-limited interview codes
- **Token storage**: `localStorage.getItem('access_token')` (frontend)
- **Auto-refresh**: Axios interceptor handles token refresh on 401

### Biometric Contract Flow
```
1. Draft Contract → PDF Generation
2. Edit Option (before authentication)
3. Biometric Authentication (5 steps):
   a. Face Capture (front + side)
   b. Document Verification (Colombian IDs)
   c. Combined Verification (document + face)
   d. Voice Recording (contract phrase)
   e. Digital Signature
4. Contract Activation → Execution Phase
```

**Sequential Order Guarantee**: Tenant → Guarantor → Landlord (enforced by backend)

**Biometric API Endpoints**:
```
POST /api/v1/contracts/{id}/start-authentication/
POST /api/v1/contracts/{id}/face-capture/
POST /api/v1/contracts/{id}/document-capture/
POST /api/v1/contracts/{id}/combined-capture/
POST /api/v1/contracts/{id}/voice-capture/
POST /api/v1/contracts/{id}/complete-auth/
GET  /api/v1/contracts/{id}/auth-status/
```

### Contract System Architecture
**Dual Model System**:
- `Contract` (legacy system, required for biometric authentication)
- `LandlordControlledContract` (new system with workflow states)

**Critical**: Both records must exist for biometric flow. Use `sync_biometric_contract.py` to synchronize.

**Workflow States**:
- `pending_tenant_biometric` → Tenant must complete authentication
- `pending_guarantor_biometric` → Guarantor must complete (if applicable)
- `pending_landlord_biometric` → Landlord must complete
- `completed_biometric` → All parties authenticated
- `active` → Contract is executing

### Property Management
**Image Upload System**:
- **Drag & drop reordering**: @hello-pangea/dnd
- **Automatic compression**: Max 1920x1080, 85% quality
- **Format support**: JPEG, PNG, WebP
- **Mobile optimization**: Touch-friendly interface
- **Validation**: 5MB max per image, 10 images max

**File Upload Pattern**:
```typescript
const formData = new FormData();
formData.append('property_id', propertyId);
images.forEach((image) => {
  formData.append('images', image.file);
});
// Backend expects 'images' field name
```

### WebSocket Connections
**4 WebSocket Types**:
1. `ws://localhost:8000/ws/messaging/` - General messaging
2. `ws://localhost:8000/ws/notifications/` - Push notifications
3. `ws://localhost:8000/ws/messaging/thread/{thread_id}/` - Thread-specific
4. `ws://localhost:8000/ws/user-status/` - Online/offline status

**Connection Pattern**:
```typescript
import { websocketService } from '@/services/websocketService';
websocketService.connect('messaging');
websocketService.subscribe('message.new', handleNewMessage);
```

### Caching Strategy
**Multi-level Cache (Redis + fallback)**:
- `default` - General cache (5 min TTL)
- `sessions` - Session data (1 hour TTL)
- `query_cache` - Query results (15 min TTL)
- `local_fallback` - In-memory backup

**Cache Keys**:
```python
# Properties
f'property_list_{filters_hash}'
f'property_detail_{property_id}'
f'property_filters_{user_role}'

# Contracts
f'contract_{contract_id}_status'
f'user_{user_id}_contracts'
```

### Performance Monitoring
**Frontend Tracking**:
```typescript
import { usePerformanceTracking } from '@/utils/performanceMonitor';

const { trackRender, startOperation, endOperation } =
  usePerformanceTracking('ComponentName');

// Tracks slow renders (>16ms), API calls (>1s), operations (>2s)
```

**Backend Middleware**: `core.middleware.PerformanceMonitoringMiddleware`
- Logs slow queries (>100ms)
- Tracks endpoint response times
- Integrates with Sentry APM (production)

---

## Common Development Patterns

### Creating New Django App
```bash
python manage.py startapp newapp
# 1. Add to INSTALLED_APPS in settings.py
# 2. Create api_urls.py for REST endpoints
# 3. Add to verihome/urls.py API v1 includes
```

### Adding New API Endpoint
```python
# app/api_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def my_endpoint(request):
    return Response({'status': 'success'})

# app/api_urls.py
urlpatterns = [
    path('my-endpoint/', views.my_endpoint, name='my-endpoint'),
]
```

### File Upload Handling
```python
# Django View
from rest_framework.parsers import MultiPartParser, FormParser

class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        files = request.FILES.getlist('fieldname')
        # Process files...
```

### WebSocket Consumer Pattern
```python
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class MyConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("group_name", self.channel_name)
        await self.accept()

    async def receive_json(self, content):
        await self.channel_layer.group_send("group_name", {
            'type': 'message.new',
            'data': content
        })
```

---

## Environment Configuration

### Required .env Variables (Backend Root)
```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (auto-falls back to SQLite)
DATABASE_URL=postgresql://user:pass@localhost:5432/verihome

# Redis (auto-falls back to local memory)
REDIS_URL=redis://localhost:6379

# Email
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend URL for invitations
FRONTEND_URL=http://localhost:5173
```

### Frontend .env Variables
```bash
# API
VITE_API_URL=http://localhost:8000/api/v1

# Mapbox
VITE_MAPBOX_TOKEN=your-mapbox-token
VITE_DEFAULT_COUNTRY=CO
VITE_DEFAULT_LAT=4.5709
VITE_DEFAULT_LNG=-74.2973
VITE_DEFAULT_ZOOM=6
```

---

## Testing Guidelines

### Backend Testing
```bash
pytest                              # Run all tests
pytest users/tests.py              # Test specific app
pytest --cov=.                     # With coverage
```

### Frontend Testing
```bash
npm test                           # All tests
npm run test:components            # Component tests
npm run test:coverage              # With coverage
npm run test:ci                    # CI mode
```

**Test File Locations**:
- Components: `src/components/**/__tests__/*.test.tsx`
- Hooks: `src/hooks/__tests__/*.test.ts`
- Services: `src/services/__tests__/*.test.ts`

---

## Known Issues & Considerations

### Database Fallback
If PostgreSQL unavailable, SQLite auto-activates. Check logs for:
```
Using cache local como fallback - Redis no disponible
Usando InMemoryChannelLayer - Redis no disponible
```

### Biometric System
- APIs use ML simulation (ready for production integration)
- Colombian documents supported: Cédula, Pasaporte, Licencia, RUT, NIT
- Security thresholds configurable per contract type

### Mobile Responsiveness
- Breakpoint: Material-UI `md` (960px)
- Desktop: Data tables with full features
- Mobile: Card layouts with touch optimization
- Biometric: Touch-friendly interfaces

### Port Configuration
- **Backend**: Port 8000 (default Django)
- **Frontend**: Port 5173 (Vite dev server)
- **WebSocket**: Same as backend (8000)

---

## Colombian Legal Compliance

### Contract System
- **Law 820 of 2003**: Urban Housing Rental Law
- **Clause Manager**: Automatic clause generation for compliance
- **Document Types**: Colombian ID formats (CC, CE, Passport, etc.)
- **Notarial Design**: Professional templates with Goddess Themis watermark

### Supported Document Types
1. **Cédula de Ciudadanía (CC)**: 8-10 digit number
2. **Cédula de Extranjería (CE)**: 6-7 digit number
3. **Pasaporte**: 2 letters + 7 digits
4. **Licencia de Conducción**: 40 + 9 digits
5. **RUT**: 9 digits + verification digit

---

## Production Deployment Notes

### Static Files
```bash
python manage.py collectstatic --noinput
# Frontend builds to: staticfiles/frontend/
```

### WebSocket (Daphne + Nginx)
```bash
daphne -b 0.0.0.0 -p 8001 verihome.asgi:application
```

### Celery Workers
```bash
celery -A verihome worker -l info
celery -A verihome beat -l info
```

### Security Checklist
- Set `DEBUG=False`
- Configure `ALLOWED_HOSTS`
- Use HTTPS (`SECURE_SSL_REDIRECT=True`)
- Set secure cookies (`SESSION_COOKIE_SECURE=True`)
- Configure CORS for specific origins
- Enable Sentry monitoring

---

## Key Files Reference

**Critical Backend Files**:
- `verihome/settings.py` - Comprehensive configuration with fallbacks
- `contracts/biometric_service.py` - 5-step biometric verification
- `contracts/pdf_generator.py` - Professional PDF with notarial design
- `core/middleware.py` - Security, rate limiting, performance
- `messaging/consumers.py` - WebSocket consumer implementations

**Critical Frontend Files**:
- `src/components/contracts/BiometricAuthenticationFlow.tsx` - Biometric orchestration
- `src/components/contracts/LandlordContractForm.tsx` - Contract creation
- `src/services/api.ts` - Axios configuration with interceptors
- `src/contexts/AuthContext.tsx` - Global authentication state
- `src/utils/performanceMonitor.ts` - Performance tracking

---

## Development Standards

### TypeScript
- Strict mode enabled
- No `any` types (use proper interfaces)
- Comprehensive type definitions in `src/types/`

### Code Style
- **Backend**: PEP 8 (Django conventions)
- **Frontend**: ESLint + Prettier configuration
- **Imports**: Absolute imports with `@/` alias

### Error Handling
- Use ErrorBoundary components for React
- Backend: Comprehensive exception handling with logging
- User-friendly error messages (Spanish for Colombian users)

### Commit Messages
Use conventional commits format (enforced):
```
feat: Add biometric authentication flow
fix: Resolve contract approval 404 error
refactor: Optimize property query performance
docs: Update API documentation
```

---

**Last Updated**: September 29, 2025
**Version**: Production-ready with enterprise-grade biometric authentication