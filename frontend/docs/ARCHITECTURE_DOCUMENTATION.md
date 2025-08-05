# VeriHome System Architecture Documentation

**Version:** 1.0.0  
**Last Updated:** 2024-01-01  
**Document Type:** Technical Architecture Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Frontend Architecture](#frontend-architecture)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Security Architecture](#security-architecture)
8. [Performance Architecture](#performance-architecture)
9. [Database Schema](#database-schema)
10. [API Architecture](#api-architecture)
11. [Integration Points](#integration-points)
12. [Deployment Architecture](#deployment-architecture)
13. [Scalability Considerations](#scalability-considerations)
14. [Future Architecture Evolution](#future-architecture-evolution)

---

## System Overview

VeriHome is a comprehensive real estate management platform built with modern web technologies, following microservices architecture principles with a clear separation between frontend and backend services.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        VeriHome Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                     Presentation Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Web App   │  │ Mobile App  │  │    Admin Dashboard      │  │
│  │  (React)    │  │  (Future)   │  │     (React)             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       API Gateway                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   nginx / Load Balancer                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Business Logic Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Auth      │  │ Properties  │  │      Contracts          │  │
│  │  Service    │  │  Service    │  │      Service            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Payments   │  │  Messages   │  │       Ratings           │  │
│  │  Service    │  │  Service    │  │       Service           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ PostgreSQL  │  │    Redis    │  │      File Storage       │  │
│  │ (Primary)   │  │   (Cache)   │  │       (S3/Local)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   External Services                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Mapbox    │  │   Stripe    │  │     Email Service       │  │
│  │    Maps     │  │  Payments   │  │      (SendGrid)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### System Components

- **Frontend Application**: React-based SPA with TypeScript
- **API Layer**: RESTful APIs with Django REST Framework
- **Database**: PostgreSQL for persistence, Redis for caching
- **File Storage**: S3-compatible storage for media files
- **External Services**: Third-party integrations for maps, payments, etc.

---

## Architecture Patterns

### 1. Component-Based Architecture
- **Pattern**: Atomic Design with functional components
- **Benefits**: Reusability, maintainability, testability
- **Implementation**: React functional components with hooks

### 2. Layered Architecture
```
┌─────────────────────────────────────┐
│         Presentation Layer          │  ← React Components, Pages
├─────────────────────────────────────┤
│         Application Layer           │  ← Custom Hooks, Services
├─────────────────────────────────────┤
│           Domain Layer              │  ← Business Logic, Types
├─────────────────────────────────────┤
│       Infrastructure Layer          │  ← API Calls, External Services
└─────────────────────────────────────┘
```

### 3. Repository Pattern
- **Implementation**: Service layer abstracting API calls
- **Benefits**: Decoupled data access, easier testing
- **Example**: `propertyService.ts`, `authService.ts`

### 4. Observer Pattern
- **Implementation**: React Query for state management
- **Benefits**: Automatic cache invalidation, optimistic updates
- **Usage**: Real-time data synchronization

---

## Frontend Architecture

### Technology Stack

```typescript
// Core Technologies
const techStack = {
  framework: "React 18",
  language: "TypeScript 5.x",
  bundler: "Vite 5.x",
  styling: "Material-UI (MUI) 5.x",
  stateManagement: "React Query + Context API",
  routing: "React Router 6.x",
  testing: "Jest + React Testing Library",
  validation: "React Hook Form + Yup",
  http: "Axios",
  utilities: ["date-fns", "lodash"],
};
```

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── common/         # Shared components
│   ├── contracts/      # Contract management
│   ├── dashboard/      # Dashboard widgets
│   ├── layout/         # Layout components
│   ├── matching/       # Property matching
│   ├── messages/       # Messaging system
│   ├── modals/         # Modal dialogs
│   ├── notifications/  # Notification system
│   ├── payments/       # Payment components
│   ├── properties/     # Property management
│   ├── ratings/        # Rating system
│   └── verification/   # Verification flows
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Core libraries & utilities
├── pages/              # Page components
├── routes/             # Route definitions
├── services/           # API service layer
├── theme/              # Material-UI theme
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── translations/       # Internationalization
```

### Component Hierarchy

```
App
├── AuthProvider
│   ├── QueryClientProvider
│   │   ├── ThemeProvider
│   │   │   ├── Router
│   │   │   │   ├── Layout
│   │   │   │   │   ├── Header
│   │   │   │   │   ├── Sidebar
│   │   │   │   │   ├── Main Content
│   │   │   │   │   └── Footer
│   │   │   │   └── Pages
│   │   │   │       ├── Dashboard
│   │   │   │       ├── Properties
│   │   │   │       ├── Contracts
│   │   │   │       ├── Messages
│   │   │   │       └── Settings
│   │   │   └── Modals
│   │   └── Notifications
│   └── ErrorBoundary
```

---

## Component Architecture

### Component Categories

#### 1. Layout Components
```typescript
// Layout structure
interface LayoutComponent {
  purpose: "structural" | "navigational";
  reusability: "high";
  examples: ["Layout", "Header", "Sidebar", "Footer"];
}
```

#### 2. Feature Components
```typescript
// Business logic components
interface FeatureComponent {
  purpose: "business-logic";
  reusability: "medium";
  examples: ["PropertyForm", "ContractDetail", "PaymentTable"];
  dependencies: ["hooks", "services", "types"];
}
```

#### 3. UI Components
```typescript
// Pure UI components
interface UIComponent {
  purpose: "presentation";
  reusability: "high";
  examples: ["LoadingSpinner", "CustomNotification", "ErrorBoundary"];
  dependencies: ["minimal"];
}
```

### Component Design Principles

#### 1. Single Responsibility
```typescript
// Good: Component has one clear purpose
const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  return (
    <Card>
      <PropertyImage src={property.image_url} />
      <PropertyDetails property={property} />
      <PropertyActions property={property} />
    </Card>
  );
};

// Avoid: Component doing too many things
const PropertyManagement: React.FC = () => {
  // Handles: listing, filtering, creating, editing, deleting
  // Should be split into multiple components
};
```

#### 2. Props Interface Design
```typescript
// Well-defined interfaces
interface PropertyFormProps {
  property?: Property;
  mode: "create" | "edit";
  onSubmit: (data: PropertyCreateInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// Component with clear contract
const PropertyForm: React.FC<PropertyFormProps> = ({
  property,
  mode,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  // Implementation
};
```

#### 3. Component Composition
```typescript
// Composable components
const PropertyDetail: React.FC<{ propertyId: string }> = ({ propertyId }) => {
  const { data: property, loading } = useProperty(propertyId);

  if (loading) return <PropertyDetailSkeleton />;
  if (!property) return <PropertyNotFound />;

  return (
    <PropertyDetailContainer>
      <PropertyHeader property={property} />
      <PropertyGallery images={property.images} />
      <PropertyDescription description={property.description} />
      <PropertyFeatures features={property.features} />
      <PropertyContact owner={property.owner} />
    </PropertyDetailContainer>
  );
};
```

---

## State Management

### State Management Strategy

```typescript
// State management layers
const stateArchitecture = {
  globalState: {
    tool: "React Context API",
    scope: "Authentication, Theme, Language",
    pattern: "Provider/Consumer",
  },
  serverState: {
    tool: "React Query (TanStack Query)",
    scope: "API data, caching, synchronization",
    pattern: "Query/Mutation hooks",
  },
  localState: {
    tool: "useState, useReducer",
    scope: "Component-specific state",
    pattern: "React hooks",
  },
  formState: {
    tool: "React Hook Form",
    scope: "Form validation and submission",
    pattern: "Form controllers",
  },
};
```

### Global State Management

```typescript
// Auth Context
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
```

### Server State Management

```typescript
// React Query hooks
export const useProperties = (filters?: PropertyFilters) => {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: () => getProperties(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
};

// Custom hook combining multiple queries
export const usePropertyDetail = (id: string) => {
  const propertyQuery = useQuery({
    queryKey: ["property", id],
    queryFn: () => getProperty(parseInt(id)),
  });

  const ratingsQuery = useQuery({
    queryKey: ["ratings", id],
    queryFn: () => getRatings({ property_id: id }),
    enabled: !!propertyQuery.data,
  });

  return {
    property: propertyQuery.data,
    ratings: ratingsQuery.data,
    loading: propertyQuery.isLoading || ratingsQuery.isLoading,
    error: propertyQuery.error || ratingsQuery.error,
  };
};
```

### Form State Management

```typescript
// Form validation schema
const propertySchema = yup.object({
  title: yup.string().required("Title is required"),
  price: yup.number().positive("Price must be positive").required(),
  bedrooms: yup.number().min(1).required(),
  bathrooms: yup.number().min(1).required(),
  address: yup.string().required("Address is required"),
});

// Form component with validation
const PropertyForm: React.FC<PropertyFormProps> = ({ onSubmit }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: yupResolver(propertySchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="title"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            error={!!errors.title}
            helperText={errors.title?.message}
          />
        )}
      />
      {/* Other form fields */}
    </form>
  );
};
```

---

## Data Flow Architecture

### Unidirectional Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│     UI      │───▶│   Actions   │───▶│   Server    │
│ Components  │    │  (Hooks)    │    │    API      │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                                     │
       │           ┌─────────────┐           │
       └───────────│    State    │◀──────────┘
                   │   (Cache)   │
                   └─────────────┘
```

### Data Flow Patterns

#### 1. Query Pattern (Read Operations)
```typescript
// Data flows from server to UI
const PropertyList: React.FC = () => {
  // 1. Hook initiates query
  const { data: properties, loading, error } = useProperties();

  // 2. Loading state shown to user
  if (loading) return <LoadingSpinner />;
  
  // 3. Error handling
  if (error) return <ErrorMessage error={error} />;

  // 4. Data rendered in UI
  return (
    <Grid container spacing={2}>
      {properties?.map(property => (
        <Grid item xs={12} md={6} lg={4} key={property.id}>
          <PropertyCard property={property} />
        </Grid>
      ))}
    </Grid>
  );
};
```

#### 2. Mutation Pattern (Write Operations)
```typescript
// Data flows from UI to server with optimistic updates
const PropertyForm: React.FC = () => {
  const createProperty = useCreateProperty();

  const handleSubmit = async (data: PropertyFormData) => {
    try {
      // 1. UI triggers mutation
      await createProperty.mutateAsync(data);
      
      // 2. Success feedback
      toast.success("Property created successfully");
      
      // 3. Navigation or state update
      navigate("/properties");
    } catch (error) {
      // 4. Error handling
      toast.error("Failed to create property");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

#### 3. Real-time Updates Pattern
```typescript
// WebSocket or polling for real-time data
const useRealTimeMessages = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/messages/`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Update cache with new message
      queryClient.setQueryData(
        ["messages"],
        (oldData: Message[]) => [...oldData, message]
      );
    };

    return () => ws.close();
  }, [queryClient]);
};
```

---

## Security Architecture

### Authentication & Authorization

```typescript
// JWT Token Management
interface AuthToken {
  access: string;
  refresh: string;
  expiresAt: number;
}

class TokenManager {
  private static instance: TokenManager;
  private token: AuthToken | null = null;

  static getInstance() {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  setToken(token: AuthToken) {
    this.token = token;
    localStorage.setItem("authToken", JSON.stringify(token));
  }

  getToken(): string | null {
    return this.token?.access || null;
  }

  isTokenExpired(): boolean {
    if (!this.token) return true;
    return Date.now() > this.token.expiresAt;
  }

  async refreshToken(): Promise<void> {
    if (!this.token?.refresh) {
      throw new Error("No refresh token available");
    }

    const response = await api.post("/auth/refresh/", {
      refresh: this.token.refresh,
    });

    this.setToken(response.data);
  }
}
```

### Route Protection

```typescript
// Protected Route Component
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Usage in routes
const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin"
      element={
        <ProtectedRoute requiredRoles={["admin"]}>
          <AdminPanel />
        </ProtectedRoute>
      }
    />
  </Routes>
);
```

### Input Validation & Sanitization

```typescript
// XSS Prevention
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
  });
};

// Input validation
const validateInput = (input: string, type: "email" | "text" | "number") => {
  const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    text: /^[a-zA-Z0-9\s\-_.,!?]*$/,
    number: /^\d+(\.\d+)?$/,
  };

  return patterns[type].test(input);
};
```

---

## Performance Architecture

### Code Splitting Strategy

```typescript
// Route-based code splitting
const PropertyList = lazy(() => import("../pages/properties/PropertyList"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Profile = lazy(() => import("../pages/Profile"));

// Component-based code splitting
const PropertyDetail = lazy(() => 
  import("../components/properties/PropertyDetail")
);

// Route configuration with suspense
const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoadingSpinner />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/properties" element={<PropertyList />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  </Suspense>
);
```

### Caching Strategy

```typescript
// React Query cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Cache keys strategy
const cacheKeys = {
  properties: (filters?: PropertyFilters) => ["properties", filters],
  property: (id: number) => ["property", id],
  userProperties: (userId: number) => ["properties", "user", userId],
  propertyImages: (propertyId: number) => ["property", propertyId, "images"],
} as const;
```

### Image Optimization

```typescript
// Responsive image component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  lazy = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const optimizedSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (width) params.set("w", width.toString());
    if (height) params.set("h", height.toString());
    params.set("f", "webp");
    params.set("q", "80");

    return `${CDN_URL}/optimize?url=${encodeURIComponent(src)}&${params}`;
  }, [src, width, height]);

  return (
    <Box position="relative">
      {!isLoaded && !error && <Skeleton width={width} height={height} />}
      <img
        src={optimizedSrc}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        style={{
          display: isLoaded ? "block" : "none",
          width: "100%",
          height: "auto",
        }}
      />
      {error && <ImageError width={width} height={height} />}
    </Box>
  );
};
```

### Virtual Scrolling for Large Lists

```typescript
// Virtual list implementation for property listings
const VirtualPropertyList: React.FC<{ properties: Property[] }> = ({
  properties,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

  const ITEM_HEIGHT = 200;
  const CONTAINER_HEIGHT = 600;
  const VISIBLE_ITEMS = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT);

  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current) return;

      const scrollTop = listRef.current.scrollTop;
      const start = Math.floor(scrollTop / ITEM_HEIGHT);
      const end = Math.min(start + VISIBLE_ITEMS + 2, properties.length);

      setVisibleRange({ start, end });
    };

    const listElement = listRef.current;
    listElement?.addEventListener("scroll", handleScroll);
    return () => listElement?.removeEventListener("scroll", handleScroll);
  }, [properties.length]);

  const visibleProperties = properties.slice(visibleRange.start, visibleRange.end);
  const totalHeight = properties.length * ITEM_HEIGHT;
  const offsetY = visibleRange.start * ITEM_HEIGHT;

  return (
    <Box
      ref={listRef}
      height={CONTAINER_HEIGHT}
      overflow="auto"
      position="relative"
    >
      <Box height={totalHeight}>
        <Box
          position="absolute"
          top={offsetY}
          width="100%"
        >
          {visibleProperties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              style={{ height: ITEM_HEIGHT }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};
```

---

## Database Schema

### Entity Relationship Diagram

```sql
-- Core Entities
Users ||--o{ Properties : "owns"
Users ||--o{ Contracts : "signs as tenant"
Users ||--o{ Messages : "sends/receives"
Users ||--o{ Ratings : "creates"

Properties ||--o{ Contracts : "has"
Properties ||--o{ PropertyImages : "has"
Properties ||--o{ Ratings : "receives"

Contracts ||--o{ Payments : "generates"
Contracts ||--o{ ServiceRequests : "related to"

Messages }o--|| Conversations : "belongs to"
ServiceRequests }o--|| Services : "requests"
```

### Detailed Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('tenant', 'owner', 'admin', 'service_provider')),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    price DECIMAL(12, 2) NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    square_feet INTEGER,
    property_type VARCHAR(20) CHECK (property_type IN ('house', 'apartment', 'condo', 'townhouse')),
    status VARCHAR(20) CHECK (status IN ('available', 'rented', 'maintenance')) DEFAULT 'available',
    features JSONB DEFAULT '{}',
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracts table
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'terminated', 'expired')) DEFAULT 'draft',
    terms TEXT,
    digital_signature JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE,
    due_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'paid', 'overdue', 'failed')) DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    parent_message_id INTEGER REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, user_id)
);

-- Services table
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price_range VARCHAR(100),
    availability VARCHAR(255),
    areas_served JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Requests table
CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'emergency')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    scheduled_date TIMESTAMP,
    completed_date TIMESTAMP,
    cost DECIMAL(10, 2),
    notes TEXT,
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_city_status ON properties(city, status);
CREATE INDEX idx_properties_price_range ON properties(price) WHERE status = 'available';
CREATE INDEX idx_properties_location ON properties USING GIST(ST_MakePoint(longitude, latitude));

CREATE INDEX idx_contracts_property_id ON contracts(property_id);
CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX idx_contracts_status_dates ON contracts(status, start_date, end_date);

CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_payments_due_date_status ON payments(due_date, status);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_user_unread ON messages(receiver_id, is_read);

-- Full-text search indexes
CREATE INDEX idx_properties_search ON properties USING GIN(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_services_search ON services USING GIN(to_tsvector('english', name || ' ' || description));
```

---

## API Architecture

### RESTful API Design

```typescript
// API endpoint structure
const apiEndpoints = {
  // Authentication
  auth: {
    login: "POST /api/v1/auth/login/",
    register: "POST /api/v1/auth/register/",
    refresh: "POST /api/v1/auth/refresh/",
    logout: "POST /api/v1/auth/logout/",
    profile: "GET|PUT /api/v1/auth/profile/",
  },
  
  // Properties
  properties: {
    list: "GET /api/v1/properties/",
    create: "POST /api/v1/properties/",
    detail: "GET /api/v1/properties/:id/",
    update: "PUT /api/v1/properties/:id/",
    delete: "DELETE /api/v1/properties/:id/",
    images: "POST /api/v1/properties/:id/images/",
  },
  
  // Contracts
  contracts: {
    list: "GET /api/v1/contracts/",
    create: "POST /api/v1/contracts/",
    detail: "GET /api/v1/contracts/:id/",
    update: "PUT /api/v1/contracts/:id/",
    sign: "POST /api/v1/contracts/:id/sign/",
    terminate: "POST /api/v1/contracts/:id/terminate/",
  },
  
  // Analytics
  analytics: {
    dashboard: "GET /api/v1/analytics/dashboard/",
    income: "GET /api/v1/analytics/income/:period/",
    occupancy: "GET /api/v1/analytics/occupancy/:period/",
    reports: "POST /api/v1/analytics/reports/generate/",
  },
};
```

### API Response Standards

```typescript
// Standard API response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    version: string;
  };
}

// Success response example
const successResponse: ApiResponse<Property[]> = {
  success: true,
  data: [
    {
      id: 1,
      title: "Beautiful Apartment",
      price: 2500,
      // ... other property fields
    },
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 20,
      total: 150,
      totalPages: 8,
    },
    timestamp: "2024-01-01T12:00:00Z",
    version: "1.0.0",
  },
};

// Error response example
const errorResponse: ApiResponse<never> = {
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input data",
    details: {
      price: ["Price must be a positive number"],
      bedrooms: ["Bedrooms is required"],
    },
  },
  meta: {
    timestamp: "2024-01-01T12:00:00Z",
    version: "1.0.0",
  },
};
```

---

## Integration Points

### External Service Integrations

#### 1. Payment Processing (Stripe)
```typescript
// Stripe integration service
class StripeService {
  private stripe: Stripe;

  constructor(publishableKey: string) {
    this.stripe = new Stripe(publishableKey, {
      apiVersion: "2023-10-16",
    });
  }

  async createPaymentIntent(amount: number, currency = "usd") {
    return await this.stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  async confirmPayment(clientSecret: string, paymentMethod: any) {
    return await this.stripe.confirmPayment({
      clientSecret,
      paymentMethod,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
    });
  }
}
```

#### 2. Map Services (Mapbox)
```typescript
// Mapbox integration
interface MapboxConfig {
  accessToken: string;
  style: string;
  center: [number, number];
  zoom: number;
}

const MapComponent: React.FC<{ properties: Property[] }> = ({ properties }) => {
  const mapConfig: MapboxConfig = {
    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
    style: "mapbox://styles/mapbox/streets-v11",
    center: [-74.006, 40.7128], // NYC
    zoom: 10,
  };

  useEffect(() => {
    mapboxgl.accessToken = mapConfig.accessToken;
    
    const map = new mapboxgl.Map({
      container: "map",
      style: mapConfig.style,
      center: mapConfig.center,
      zoom: mapConfig.zoom,
    });

    // Add property markers
    properties.forEach(property => {
      if (property.latitude && property.longitude) {
        new mapboxgl.Marker()
          .setLngLat([property.longitude, property.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <h3>${property.title}</h3>
              <p>$${property.price}/month</p>
            `)
          )
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [properties]);

  return <div id="map" style={{ width: "100%", height: "400px" }} />;
};
```

#### 3. Email Service (SendGrid)
```typescript
// Email service integration
interface EmailTemplate {
  templateId: string;
  subject: string;
  dynamicTemplateData: Record<string, any>;
}

class EmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendContractSignedEmail(contract: Contract) {
    const template: EmailTemplate = {
      templateId: "d-contract-signed",
      subject: "Contract Signed Successfully",
      dynamicTemplateData: {
        tenantName: contract.tenant.first_name,
        propertyTitle: contract.property.title,
        startDate: contract.start_date,
        monthlyRent: contract.monthly_rent,
      },
    };

    return this.sendEmail(contract.tenant.email, template);
  }

  private async sendEmail(to: string, template: EmailTemplate) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: "noreply@verihome.com", name: "VeriHome" },
        personalizations: [
          {
            to: [{ email: to }],
            dynamic_template_data: template.dynamicTemplateData,
          },
        ],
        template_id: template.templateId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### Webhook Integration

```typescript
// Webhook handler for external service events
interface WebhookEvent {
  type: string;
  data: any;
  timestamp: string;
  source: string;
}

class WebhookProcessor {
  async processStripeWebhook(event: WebhookEvent) {
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSuccess(event.data);
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentFailure(event.data);
        break;
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    // Update payment status in database
    await updatePayment(paymentIntent.metadata.payment_id, {
      status: "paid",
      transaction_id: paymentIntent.id,
    });

    // Send confirmation email
    await emailService.sendPaymentConfirmation(paymentIntent.metadata.user_email);
  }

  private async handlePaymentFailure(paymentIntent: any) {
    // Update payment status and notify user
    await updatePayment(paymentIntent.metadata.payment_id, {
      status: "failed",
    });

    // Send failure notification
    await emailService.sendPaymentFailureNotification(paymentIntent.metadata.user_email);
  }
}
```

---

## Deployment Architecture

### Container Architecture

```dockerfile
# Multi-stage Dockerfile for production
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine as production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Kubernetes Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: verihome-frontend
  labels:
    app: verihome-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: verihome-frontend
  template:
    metadata:
      labels:
        app: verihome-frontend
    spec:
      containers:
      - name: frontend
        image: verihome/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: API_URL
          valueFrom:
            configMapKeyRef:
              name: frontend-config
              key: api-url
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: verihome-frontend-service
spec:
  selector:
    app: verihome-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: verihome-frontend-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - verihome.com
    secretName: verihome-tls
  rules:
  - host: verihome.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: verihome-frontend-service
            port:
              number: 80
```

### Infrastructure as Code

```hcl
# terraform/main.tf
resource "aws_s3_bucket" "frontend_assets" {
  bucket = "verihome-frontend-assets"
  
  website {
    index_document = "index.html"
    error_document = "error.html"
  }
}

resource "aws_cloudfront_distribution" "frontend_cdn" {
  origin {
    domain_name = aws_s3_bucket.frontend_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend_assets.bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend_assets.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  aliases = ["verihome.com", "www.verihome.com"]

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cert.arn
    ssl_support_method  = "sni-only"
  }
}
```

---

## Scalability Considerations

### Horizontal Scaling

```typescript
// Load balancing strategy
const loadBalancingConfig = {
  instances: {
    min: 2,
    max: 10,
    target_cpu: 70,
  },
  regions: ["us-east-1", "us-west-2", "eu-west-1"],
  cdn: {
    provider: "AWS CloudFront",
    edge_locations: "global",
    cache_ttl: {
      static_assets: "1 year",
      api_responses: "5 minutes",
      user_data: "no cache",
    },
  },
};
```

### Database Scaling

```sql
-- Read replica configuration
CREATE PUBLICATION verihome_publication FOR ALL TABLES;

-- Partitioning strategy for large tables
CREATE TABLE messages_y2024m01 PARTITION OF messages
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE messages_y2024m02 PARTITION OF messages
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Indexing strategy for performance
CREATE INDEX CONCURRENTLY idx_properties_search_vector 
    ON properties USING GIN(search_vector);
```

### Caching Strategy

```typescript
// Multi-level caching architecture
const cachingStrategy = {
  levels: {
    browser: {
      type: "HTTP cache headers",
      duration: "static assets: 1 year, API: 5 minutes",
    },
    cdn: {
      type: "CloudFront",
      duration: "static: 1 year, dynamic: 5 minutes",
    },
    application: {
      type: "React Query",
      duration: "5 minutes with background refresh",
    },
    database: {
      type: "Redis",
      duration: "frequently accessed data: 1 hour",
    },
  },
};

// Cache invalidation strategy
const cacheInvalidation = {
  strategies: [
    "Time-based expiration",
    "Event-based invalidation",
    "Manual invalidation via admin panel",
    "Cache tags for related data",
  ],
};
```

---

## Future Architecture Evolution

### Planned Improvements

#### 1. Microservices Migration
```typescript
// Future microservices architecture
const microservicesRoadmap = {
  phase1: {
    services: ["auth-service", "user-service"],
    timeline: "Q2 2024",
    benefits: ["Better scalability", "Independent deployments"],
  },
  phase2: {
    services: ["property-service", "contract-service"],
    timeline: "Q3 2024",
    benefits: ["Domain separation", "Team autonomy"],
  },
  phase3: {
    services: ["payment-service", "notification-service"],
    timeline: "Q4 2024",
    benefits: ["Specialized scaling", "Technology diversity"],
  },
};
```

#### 2. Event-Driven Architecture
```typescript
// Event-driven architecture implementation
interface DomainEvent {
  id: string;
  type: string;
  aggregate_id: string;
  data: any;
  timestamp: string;
  version: number;
}

class EventBus {
  private subscribers = new Map<string, Function[]>();

  subscribe(eventType: string, handler: Function) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  async publish(event: DomainEvent) {
    const handlers = this.subscribers.get(event.type) || [];
    await Promise.all(handlers.map(handler => handler(event)));
  }
}

// Usage example
eventBus.subscribe("contract.signed", async (event) => {
  await emailService.sendContractConfirmation(event.data);
  await notificationService.createNotification(event.data);
  await analyticsService.trackContractSigning(event.data);
});
```

#### 3. Progressive Web App Features
```typescript
// PWA implementation roadmap
const pwaFeatures = {
  serviceWorker: {
    caching: "Cache-first for assets, network-first for API",
    offline: "Limited offline functionality",
    backgroundSync: "Queue actions when offline",
  },
  webManifest: {
    installable: true,
    icons: "Multiple sizes and formats",
    display: "standalone",
  },
  pushNotifications: {
    realTime: "Property updates, payment reminders",
    personalized: "Based on user preferences",
  },
};
```

#### 4. AI/ML Integration
```typescript
// Future AI features
const aiIntegration = {
  propertyRecommendation: {
    algorithm: "Collaborative and content-based filtering",
    data: "User preferences, viewing history, ratings",
    implementation: "TensorFlow.js for client-side inference",
  },
  priceOptimization: {
    algorithm: "Regression models with market data",
    factors: ["Location, size, amenities, market trends"],
    updates: "Real-time price suggestions",
  },
  chatbot: {
    platform: "Natural language processing",
    capabilities: ["Property search", "FAQ", "Appointment scheduling"],
    integration: "WebSocket for real-time communication",
  },
};
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Frontend Framework Selection

**Status**: Accepted  
**Date**: 2024-01-01

**Context**: Need to choose a frontend framework for the VeriHome platform.

**Decision**: Use React with TypeScript

**Rationale**:
- Large ecosystem and community support
- Excellent TypeScript integration
- Rich component library ecosystem (Material-UI)
- Strong developer tools and debugging support
- Team expertise and hiring availability

**Consequences**:
- Positive: Fast development, good performance, large community
- Negative: Bundle size considerations, learning curve for new developers

### ADR-002: State Management Strategy

**Status**: Accepted  
**Date**: 2024-01-01

**Context**: Need efficient state management for complex application state.

**Decision**: Use React Query for server state, Context API for global client state

**Rationale**:
- React Query handles caching, synchronization, and background updates
- Context API sufficient for authentication and theme state
- Avoids complexity of Redux for current requirements
- Better performance with automatic optimization

**Consequences**:
- Positive: Less boilerplate, automatic caching, better UX
- Negative: Learning curve, potential over-fetching in some cases

### ADR-003: Build Tool Selection

**Status**: Accepted  
**Date**: 2024-01-01

**Context**: Need fast build tool for development and production.

**Decision**: Use Vite instead of Create React App

**Rationale**:
- Significantly faster hot module replacement
- Better tree-shaking and bundle optimization
- Native ES modules support
- Extensible plugin system
- Better TypeScript support

**Consequences**:
- Positive: Faster development experience, smaller bundles
- Negative: Newer tool with potentially fewer resources

---

**Document Version**: 1.0.0  
**Last Review**: 2024-01-01  
**Next Review**: 2024-04-01  
**Maintainer**: Architecture Team <architecture@verihome.com>

---

*This architecture documentation is a living document that should be updated as the system evolves. All architectural decisions should be reviewed and approved by the technical lead and senior developers.*