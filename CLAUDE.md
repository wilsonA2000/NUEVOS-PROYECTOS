# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VeriHome** is an enterprise-grade real estate platform connecting landlords, tenants, and service providers in Colombia. Built with Django REST Framework backend and React TypeScript frontend, featuring **revolutionary biometric contract authentication** and real-time messaging.

**Key Innovation**: First-in-industry 5-step biometric verification system for legally binding contracts, compliant with Colombian Law 820 of 2003.

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
python manage.py runserver              # Development (port 8000)
python manage.py shell                  # Django shell for debugging

# Management
python manage.py makemigrations
python manage.py showmigrations
python manage.py collectstatic
```

### Frontend (React + Vite)

```bash
cd frontend

# Development
npm install
npm run dev                    # Dev server (http://localhost:5173)

# Building
npm run build                  # Production build
npm run build:prod             # Production with type checking
npm run build:analyze          # Build with bundle analysis

# Code Quality
npm run lint                   # ESLint
npm run lint:fix               # Auto-fix issues
npm run format                 # Prettier formatting
npm run type-check             # TypeScript checking (no compile)

# Testing
npm test                       # All tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm run test:components        # Component tests only
npm run test:hooks             # Hook tests only
npm run test:services          # Service tests only
npm run test:ci                # CI-optimized
```

---

## Architecture Overview

### Technology Stack

**Backend:**
- Django 4.2.7 + Django REST Framework 3.14.0
- PostgreSQL (with SQLite fallback)
- Redis (with local memory fallback)
- Django Channels 4.2.2 for WebSocket
- Celery 5.3.4 + Celery Beat for async tasks
- JWT Authentication (SimpleJWT)

**Frontend:**
- React 18 + TypeScript 5
- Vite 5 (build tool)
- Material-UI 5 (components)
- TanStack Query (data fetching)
- Axios (HTTP client)
- React Hook Form (forms)

**Real-time:**
- WebSocket (Django Channels + channels-redis)
- 4 WebSocket consumer types (messaging, notifications, threads, user-status)

---

## Django Apps Structure

```
verihome/                   # Main project config
├── settings.py            # Redis/cache fallback, WebSocket, Celery
├── urls.py                # API v1 routing
└── asgi.py                # ASGI for WebSocket

core/                      # Core functionality
├── middleware.py          # Security, rate limiting, performance
├── cache_utils.py         # Multi-level caching
├── audit_service.py       # Audit logging
└── notification_service.py

users/                     # User management & auth
├── models.py              # Custom User (email-based)
├── api_views.py           # JWT auth endpoints
├── adapters.py            # Allauth adapters
├── middleware.py          # Impersonation, admin logging
└── api_interview.py       # Interview code registration

properties/                # Property management
├── models.py              # Property with amenities/media
├── api_views.py           # CRUD endpoints
└── serializers.py         # Serialization with relations

contracts/                 # ⭐ REVOLUTIONARY BIOMETRIC SYSTEM
├── models.py              # Contract, BiometricAuthentication
├── biometric_service.py   # 5-step ML verification
├── pdf_generator.py       # Professional PDF (Goddess Themis design)
├── clause_manager.py      # Dynamic Colombian law clauses
├── landlord_contract_models.py  # LandlordControlledContract
├── api_views.py           # Contract CRUD + biometric endpoints
├── landlord_api_views.py  # Landlord-specific
└── tenant_api_views.py    # Tenant-specific

matching/                  # AI-powered matching
├── models.py              # MatchRequest with workflow
├── services.py            # Matching algorithm
└── contract_integration.py

messaging/                 # Real-time messaging
├── models.py              # Message, Thread
├── consumers.py           # 4 WebSocket consumer types
├── routing.py             # WebSocket routing
└── notifications.py       # Push notifications

payments/                  # Payment processing
├── models.py              # Payment, Transaction
└── escrow_integration.py  # Escrow accounts

ratings/                   # Rating & reputation
└── models.py              # Multi-role ratings

requests/                  # Document requests
└── models.py              # TenantDocument with verification

services/                  # Service marketplace
└── models.py              # Service listings

dashboard/                 # Analytics
├── services.py            # Data aggregation
└── api_views.py           # Dashboard widgets
```

---

## Frontend Architecture

```
frontend/src/
├── components/
│   ├── contracts/                 ⭐ REVOLUTIONARY BIOMETRIC
│   │   ├── BiometricAuthenticationFlow.tsx    # 5-step orchestration
│   │   ├── CameraCapture.tsx                  # Face + quality analysis
│   │   ├── DocumentVerification.tsx           # Colombian ID OCR
│   │   ├── VoiceRecorder.tsx                  # Voice biometrics
│   │   ├── DigitalSignaturePad.tsx            # Digital signature
│   │   ├── LandlordContractForm.tsx           # Multi-step creation
│   │   ├── TenantContractsDashboard.tsx       # Tenant management
│   │   └── MatchedCandidatesView.tsx          # Landlord candidates
│   ├── properties/
│   │   ├── PropertyList.tsx                   # Responsive table/cards
│   │   ├── PropertyForm.tsx                   # Create/edit
│   │   └── EnhancedPropertyImageUpload.tsx    # Drag-drop compression
│   ├── matching/
│   │   ├── MatchesDashboard.tsx              # Match management
│   │   └── MatchRequestForm.tsx              # Submit requests
│   ├── messaging/
│   │   └── MessagesMain.tsx                  # Real-time chat
│   └── common/
│       ├── ErrorBoundaries.tsx               # Error handling
│       └── LoadingSpinner.tsx                # Loading states
│
├── services/
│   ├── api.ts                    # Axios config + interceptors
│   ├── authService.ts            # JWT authentication
│   ├── propertyService.ts        # Property CRUD
│   ├── contractService.ts        # Contract + biometric APIs
│   ├── landlordContractService.ts # Landlord operations
│   ├── matchingService.ts        # Match requests
│   ├── messageService.ts         # Messaging
│   └── websocketService.ts       # WebSocket management
│
├── hooks/
│   ├── useProperties.ts          # Property data fetching
│   ├── useContracts.ts           # Contract management
│   ├── useWebSocket.ts           # WebSocket connection
│   └── useOptimizedQueries.ts    # Performance-optimized
│
├── contexts/
│   ├── AuthContext.tsx           # Global auth state
│   └── NotificationContext.tsx   # Real-time notifications
│
├── types/
│   ├── user.ts
│   ├── property.ts
│   ├── contract.ts               # Biometric interfaces
│   └── landlordContract.ts
│
└── utils/
    ├── performanceMonitor.ts     # API/render tracking
    └── imageOptimization.ts      # Image compression
```

---

## Critical Implementation Details

### Authentication System

- **Email-based** (no username)
- **JWT tokens**: Access (1 day) + Refresh (7 days)
- **Interview code system**: Time-limited registration codes
- **Storage**: `localStorage.getItem('access_token')`
- **Auto-refresh**: Axios interceptor on 401

### ⭐ Biometric Contract Flow (REVOLUTIONARY)

```
1. Draft Contract → PDF Generation
2. Edit Option (pre-authentication)
3. Biometric Authentication (5 STEPS):
   a. Face Capture (front + side)
   b. Document Verification (Colombian IDs)
   c. Combined Verification (document + face)
   d. Voice Recording (contract phrase)
   e. Digital Signature
4. Contract Activation → Execution Phase
```

**Sequential Order**: Tenant → Guarantor (if applicable) → Landlord (**enforced by backend**)

**Biometric API Endpoints:**
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

**Dual Model System** (IMPORTANT):
- `Contract` - Legacy system, **required** for biometric flow
- `LandlordControlledContract` - New system with workflow states

**Critical**: Both records must exist. Use `scripts/fixes/sync_biometric_contract.py` to synchronize.

**Workflow States (LandlordControlledContract):**
- `PENDING_ADMIN_REVIEW` → Juridical review by VeriHome lawyer
- `RE_PENDING_ADMIN` → Re-review after corrections
- `DRAFT` → Approved by admin, ready for tenant
- `pending_tenant_biometric` → Tenant authentication
- `pending_guarantor_biometric` → Guarantor (if has guarantor)
- `pending_landlord_biometric` → Landlord authentication
- `completed_biometric` → All authenticated
- `active` → Contract executing

**New Safeguards:**
- `admin_review_deadline`: 5 business days SLA
- `admin_review_escalated`: auto-escalation flag
- Conflict of interest: `admin_user != contract.landlord` validation
- Celery tasks: `check_admin_review_sla`, `check_biometric_expiration`

### Database Fallback System

The system auto-detects PostgreSQL/Redis availability and falls back to SQLite/local memory:

```python
# scripts/database/database_config.py handles auto-detection
# Look for logs:
"Usando cache local como fallback - Redis no disponible"
"Usando InMemoryChannelLayer - Redis no disponible"
```

**PostgreSQL → SQLite fallback** (development)
**Redis → local memory fallback** (development)

### WebSocket Connections

**4 Consumer Types:**
1. `ws://localhost:8000/ws/messaging/` - General messaging
2. `ws://localhost:8000/ws/notifications/` - Push notifications
3. `ws://localhost:8000/ws/messaging/thread/{thread_id}/` - Thread-specific
4. `ws://localhost:8000/ws/user-status/` - Online/offline

**Usage Pattern:**
```typescript
import { websocketService } from '@/services/websocketService';
websocketService.connect('messaging');
websocketService.subscribe('message.new', handleNewMessage);
```

### Caching Strategy

**Multi-level Cache** (Redis + fallback):
- `default` - General (5 min TTL)
- `sessions` - Session data (1 hour TTL)
- `query_cache` - Query results (15 min TTL)
- `local_fallback` - In-memory backup

**Cache Keys Pattern:**
```python
f'property_list_{filters_hash}'
f'property_detail_{property_id}'
f'contract_{contract_id}_status'
f'user_{user_id}_contracts'
```

---

## Common Patterns

### File Upload Handling

**Backend:**
```python
from rest_framework.parsers import MultiPartParser, FormParser

class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        files = request.FILES.getlist('fieldname')
        # Process files...
```

**Frontend:**
```typescript
const formData = new FormData();
formData.append('property_id', propertyId);
images.forEach((image) => {
  formData.append('images', image.file);
});
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

### Backend (.env in root)

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

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Frontend (frontend/.env)

```bash
# API
VITE_API_URL=http://localhost:8000/api/v1

# Mapbox (for property maps)
VITE_MAPBOX_TOKEN=your-mapbox-token
VITE_DEFAULT_COUNTRY=CO
VITE_DEFAULT_LAT=4.5709
VITE_DEFAULT_LNG=-74.2973
VITE_DEFAULT_ZOOM=6
```

---

## Testing

### Backend
```bash
pytest                              # All tests
pytest users/tests.py              # Specific app
pytest --cov=.                     # With coverage
```

### Frontend
```bash
npm test                           # All tests
npm run test:components            # Components only
npm run test:coverage              # Coverage report
npm run test:ci                    # CI mode
```

**Test Locations:**
- Backend: `{app}/tests.py` or `{app}/tests/`
- Frontend: `src/**/__tests__/*.test.tsx`

---

## Colombian Legal Compliance

### Contract System
- **Law 820 of 2003**: Urban Housing Rental Law
- **Clause Manager**: Auto-generates compliant clauses
- **Document Types**: Colombian ID formats supported
- **Notarial Design**: Professional PDF with Goddess Themis watermark

### Supported Colombian Documents
1. **Cédula de Ciudadanía (CC)**: 8-10 digits
2. **Cédula de Extranjería (CE)**: 6-7 digits
3. **Pasaporte**: 2 letters + 7 digits
4. **Licencia de Conducción**: 40 + 9 digits
5. **RUT**: 9 digits + verification digit

---

## Production Deployment

### Static Files
```bash
python manage.py collectstatic --noinput
# Frontend builds to: static/frontend/
```

### WebSocket (Daphne)
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
- Set secure cookies
- Configure CORS for specific origins
- Enable Sentry monitoring (optional)

---

## Key Files Reference

### Critical Backend Files
- `verihome/settings.py` - Configuration with fallbacks (867 lines)
- `contracts/biometric_service.py` - 5-step biometric verification (1,007 lines)
- `contracts/pdf_generator.py` - Professional PDF with notarial design
- `core/middleware.py` - Security, rate limiting, performance
- `messaging/consumers.py` - 4 WebSocket consumer types

### Critical Frontend Files
- `src/components/contracts/BiometricAuthenticationFlow.tsx` - Orchestration (886 lines)
- `src/components/contracts/LandlordContractForm.tsx` - Contract creation
- `src/services/api.ts` - Axios config with interceptors
- `src/contexts/AuthContext.tsx` - Global auth state
- `src/utils/performanceMonitor.ts` - Performance tracking

### New Backend Files
- `core/models.py` - ContactMessage model
- `core/admin.py` - ContactMessage admin panel
- `contracts/tasks.py` - SLA monitoring + biometric expiration tasks

### New Frontend Files
- `src/hooks/useScrollReveal.ts` - IntersectionObserver scroll animations
- `src/components/common/ScrollToTop.tsx` - Route change scroll reset
- `src/components/common/ScrollToTopButton.tsx` - Floating scroll button
- `src/components/contracts/ContractTimeline.tsx` - Workflow history visual
- `src/pages/TermsPage.tsx` - Terms and conditions (Law 820/2003)
- `src/pages/PrivacyPage.tsx` - Privacy policy (Law 1581/2012)
- `src/pages/SecurityPage.tsx` - Security pillars page
- `src/pages/ServicesOverviewPage.tsx` - Complete rewrite with 5 service sections

---

## Test Commands Summary

### Running Tests
- Frontend: `cd frontend && npm test` (63 suites, 771 tests)
- Backend: `python manage.py test` (all apps)
- Backend specific: `python manage.py test services.tests` (87 tests)
- E2E: `cd frontend && npx playwright test` (27 tests)
- Type check: `cd frontend && npx tsc --noEmit`

---

## Important Notes

### Biometric System
- **ML APIs**: Currently use simulation (ready for production ML integration)
- **Security**: Thresholds configurable per contract type
- **Sequential**: Tenant → Guarantor → Landlord (cannot be bypassed)
- **Mobile-optimized**: Touch-friendly interfaces

### Port Configuration
- **Backend**: 8000 (Django dev server)
- **Frontend**: 5173 (Vite dev server)
- **WebSocket**: 8000 (same as backend)

### Responsive Design
- **Breakpoint**: Material-UI `md` (960px)
- **Desktop**: Full data tables
- **Mobile**: Card layouts with touch optimization
- **Biometric**: Mobile-first camera interfaces

### Code Style
- **Backend**: PEP 8 (Django conventions)
- **Frontend**: ESLint + Prettier
- **TypeScript**: Strict mode, no `any` types
- **Imports**: Absolute with `@/` alias

### Commit Messages
Use conventional commits:
```
feat: Add biometric authentication flow
fix: Resolve contract approval 404 error
refactor: Optimize property query performance
docs: Update API documentation
```

---

## Revolutionary Features Completed

✅ **Biometric Contract Authentication** - First-in-industry 5-step verification
✅ **Real-time Messaging** - WebSocket-based chat system
✅ **AI Matching** - Intelligent tenant-landlord matching
✅ **Mobile Optimization** - Touch-friendly responsive design
✅ **Colombian Compliance** - Law 820 of 2003 adherence
✅ **Dual-system Architecture** - Legacy + modern contract models
✅ **Fallback Systems** - PostgreSQL→SQLite, Redis→Memory
✅ **Professional PDFs** - Notarial design with Goddess Themis
✅ **Contract Renewal System** - IPC adjustment (Law 820 Art. 20)
✅ **Complete Payment Integration** - Stripe + Wompi/PSE + Nequi
✅ **Maintenance Request System** - Tenant-to-provider workflow
✅ **Multi-language Support** - ES/EN with react-i18next
✅ **Admin Dashboard V2** - Real-time notifications
✅ **Comprehensive Testing** - 63 test suites, 771+ frontend tests, 87+ backend tests
✅ **Contact Form** - Real backend (POST /api/v1/core/contact/ + email notification)
✅ **Legal Pages** - Terms (/terms), Privacy (/privacy, Ley 1581/2012), Security (/security)
✅ **Scroll Animations** - Scroll-reveal animations (useScrollReveal hook) + ScrollToTopButton
✅ **Google Maps Integration** - Embedded map on Contact page
✅ **Juridical Review SLA** - Contract review: 5 business days + auto-escalation
✅ **Conflict of Interest Validation** - Admin cannot approve own contracts
✅ **Contract Timeline** - Audit trail component (ContractTimeline.tsx)
✅ **Verification Agents Module** - Field agents, visits, reports, ratings (verification/ Django app)
✅ **Internal Tickets System** - SupportTicket with departments, auto-distribution from contact form, CRUD API
✅ **Service Provider Subscriptions** - 3 plans (Básico $50K, Profesional $100K, Enterprise $150K), subscribe/cancel/upgrade API
✅ **Payment Auto-Charge** - Celery task processes auto rent charges daily, creates transactions, handles failures
✅ **Payment Reconciliation** - Webhook handlers reconcile payments with RentPaymentSchedule, mark rent as paid
✅ **Payment Confirmation Emails** - Auto-email to payer + payee on success, failure notification on error

---

## Internal Tickets System (Pilar 2)

```
Departments: general, verification_agents, legal, ceo, marketing, technical, billing

Auto-distribution: ContactMessage → SupportTicket (department auto-detected by keywords)

API Endpoints:
  GET/POST   /api/v1/core/tickets/                # Ticket CRUD (staff=all, user=own)
  POST       /api/v1/core/tickets/{id}/assign/     # Assign to staff member
  POST       /api/v1/core/tickets/{id}/respond/    # Add response (internal/public)
  POST       /api/v1/core/tickets/{id}/resolve/    # Mark as resolved
  POST       /api/v1/core/tickets/{id}/close/      # Close ticket
  GET        /api/v1/core/tickets/stats/           # Statistics by dept/status/priority
```

## Verification Agents Module (Pilar 1)

```
verification/                    # Field verification system
├── models.py                   # VerificationAgent, VerificationVisit, VerificationReport
├── admin.py                    # Full admin panel with fieldsets
├── api_views.py                # 3 ViewSets + custom actions (assign, start, complete, cancel, approve)
├── serializers.py              # DRF serializers
├── api_urls.py                 # Router-based URLs
└── migrations/

API Endpoints:
  GET/POST   /api/v1/verification/agents/           # Agent CRUD
  GET        /api/v1/verification/agents/available/  # Agents with capacity
  GET        /api/v1/verification/agents/stats/      # Agent statistics
  GET/POST   /api/v1/verification/visits/            # Visit CRUD
  POST       /api/v1/verification/visits/{id}/assign_agent/  # Assign agent
  POST       /api/v1/verification/visits/{id}/start/         # Start visit
  POST       /api/v1/verification/visits/{id}/complete/      # Complete visit
  POST       /api/v1/verification/visits/{id}/cancel/        # Cancel visit
  GET/POST   /api/v1/verification/reports/           # Report CRUD
  POST       /api/v1/verification/reports/{id}/approve/  # Admin approval
```

---

**Last Updated**: March 23, 2026
**Version**: Production-ready with complete Plan Maestro implementation
**Branch**: main
