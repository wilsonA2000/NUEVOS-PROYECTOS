# VeriHome API Documentation
**Version:** 1.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**Authentication:** Bearer Token (JWT)

## Table of Contents
1. [Authentication](#authentication)
2. [Users](#users)
3. [Properties](#properties)
4. [Contracts](#contracts)
5. [Messages](#messages)
6. [Payments](#payments)
7. [Services](#services)
8. [Ratings](#ratings)
9. [Analytics](#analytics)
10. [Files](#files)
11. [Notifications](#notifications)
12. [Reports](#reports)
13. [System Management](#system-management)
14. [Error Handling](#error-handling)

---

## Authentication

All API requests require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### POST /auth/login/
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "tenant",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST /auth/register/
Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "tenant"
}
```

**Response (201):**
```json
{
  "id": 2,
  "email": "newuser@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "tenant",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### GET /auth/me/
Get current authenticated user information.

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "tenant",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### PUT /auth/profile/
Update current user profile.

**Request Body:**
```json
{
  "first_name": "John Updated",
  "last_name": "Doe Updated"
}
```

### POST /auth/logout/
Logout and invalidate current token.

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

---

## Users

### GET /users/
Get list of users (Admin only).

**Query Parameters:**
- `role` (optional): Filter by user role
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response (200):**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/v1/users/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "tenant",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /users/{id}/
Get specific user by ID.

### POST /users/
Create new user (Admin only).

### PUT /users/{id}/
Update specific user (Admin only).

### DELETE /users/{id}/
Delete specific user (Admin only).

---

## Properties

### GET /properties/
Get list of properties.

**Query Parameters:**
- `city` (optional): Filter by city
- `property_type` (optional): Filter by property type
- `status` (optional): Filter by status
- `min_price` (optional): Minimum price filter
- `max_price` (optional): Maximum price filter
- `bedrooms` (optional): Filter by number of bedrooms
- `bathrooms` (optional): Filter by number of bathrooms
- `owner_id` (optional): Filter by owner ID
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200):**
```json
{
  "count": 50,
  "next": "http://localhost:8000/api/v1/properties/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Beautiful 2BR Apartment",
      "description": "Modern apartment in downtown area",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "zip_code": "10001",
      "price": 2500.00,
      "bedrooms": 2,
      "bathrooms": 2,
      "square_feet": 1200,
      "property_type": "apartment",
      "status": "available",
      "owner_id": 5,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /properties/{id}/
Get specific property by ID.

### POST /properties/
Create new property (Owner only).

**Request Body:**
```json
{
  "title": "Beautiful 2BR Apartment",
  "description": "Modern apartment in downtown area",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "zip_code": "10001",
  "price": 2500.00,
  "bedrooms": 2,
  "bathrooms": 2,
  "square_feet": 1200,
  "property_type": "apartment",
  "status": "available",
  "owner_id": 5
}
```

### PUT /properties/{id}/
Update specific property (Owner only).

### DELETE /properties/{id}/
Delete specific property (Owner only).

---

## Contracts

### GET /contracts/
Get list of contracts.

**Query Parameters:**
- `property_id` (optional): Filter by property
- `tenant_id` (optional): Filter by tenant
- `owner_id` (optional): Filter by owner
- `status` (optional): Filter by contract status

**Response (200):**
```json
{
  "count": 20,
  "results": [
    {
      "id": 1,
      "property_id": 1,
      "tenant_id": 2,
      "owner_id": 5,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "monthly_rent": 2500.00,
      "security_deposit": 5000.00,
      "status": "active",
      "terms": "Standard rental agreement terms...",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /contracts/{id}/
Get specific contract by ID.

### POST /contracts/
Create new contract.

### PUT /contracts/{id}/
Update specific contract.

### DELETE /contracts/{id}/
Delete specific contract.

---

## Messages

### GET /messages/
Get user messages.

**Query Parameters:**
- `conversation_id` (optional): Filter by conversation
- `sender_id` (optional): Filter by sender
- `receiver_id` (optional): Filter by receiver
- `read` (optional): Filter by read status

**Response (200):**
```json
{
  "count": 15,
  "results": [
    {
      "id": 1,
      "sender_id": 1,
      "receiver_id": 2,
      "content": "Hello, I'm interested in your property",
      "read": false,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### GET /messages/{id}/
Get specific message by ID.

### POST /messages/
Send new message.

**Request Body:**
```json
{
  "receiver_id": 2,
  "content": "Hello, I'm interested in your property"
}
```

### PUT /messages/{id}/
Update message (mark as read).

### DELETE /messages/{id}/
Delete message.

---

## Payments

### GET /payments/
Get payment history.

**Query Parameters:**
- `contract_id` (optional): Filter by contract
- `status` (optional): Filter by payment status
- `date_from` (optional): Start date filter
- `date_to` (optional): End date filter

**Response (200):**
```json
{
  "count": 12,
  "results": [
    {
      "id": 1,
      "contract_id": 1,
      "amount": 2500.00,
      "payment_date": "2024-01-01",
      "due_date": "2024-01-01",
      "status": "paid",
      "payment_method": "bank_transfer",
      "reference": "PAY001",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /payments/{id}/
Get specific payment by ID.

### POST /payments/
Create new payment.

### PUT /payments/{id}/
Update payment.

### POST /payments/{id}/mark_as_paid/
Mark payment as paid.

### POST /payments/{id}/cancel/
Cancel payment.

---

## Services

### GET /services/
Get available services.

**Response (200):**
```json
{
  "count": 25,
  "results": [
    {
      "id": 1,
      "name": "Plumbing Repair",
      "description": "Professional plumbing services",
      "category": "maintenance",
      "provider_id": 10,
      "price_range": "50-150",
      "availability": "24/7",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /service-requests/
Get service requests.

**Response (200):**
```json
{
  "count": 8,
  "results": [
    {
      "id": 1,
      "property_id": 1,
      "service_id": 1,
      "tenant_id": 2,
      "description": "Kitchen sink is leaking",
      "status": "pending",
      "scheduled_date": "2024-01-05T14:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /service-requests/
Create new service request.

---

## Ratings

### GET /ratings/
Get ratings and reviews.

**Query Parameters:**
- `property_id` (optional): Filter by property
- `user_id` (optional): Filter by user
- `rating` (optional): Filter by rating value

**Response (200):**
```json
{
  "count": 30,
  "results": [
    {
      "id": 1,
      "property_id": 1,
      "user_id": 2,
      "rating": 5,
      "comment": "Excellent property and landlord",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /ratings/
Create new rating.

---

## Analytics

### GET /analytics/dashboard/
Get dashboard statistics.

**Response (200):**
```json
{
  "total_properties": 50,
  "occupied_properties": 42,
  "total_revenue": 105000.00,
  "pending_payments": 3,
  "recent_activity": [
    {
      "type": "new_contract",
      "description": "New contract signed for Property #15",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### GET /analytics/income/{period}/
Get income analytics by period (daily, weekly, monthly, yearly).

### GET /analytics/occupancy/{period}/
Get occupancy analytics by period.

### GET /analytics/recent-activity/
Get recent system activity.

---

## Files

### POST /files/upload/
Upload file.

**Request Body (multipart/form-data):**
```
file: [File]
type: "property_image" | "contract_document" | "payment_receipt"
```

**Response (201):**
```json
{
  "id": 1,
  "filename": "property_image.jpg",
  "file_url": "http://localhost:8000/media/uploads/property_image.jpg",
  "file_type": "property_image",
  "file_size": 2048576,
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

### DELETE /files/{id}/
Delete uploaded file.

---

## Notifications

### GET /notifications/
Get user notifications.

**Response (200):**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "user_id": 2,
      "title": "Payment Due",
      "message": "Your rent payment is due in 3 days",
      "type": "payment_reminder",
      "read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### PUT /notifications/{id}/read/
Mark notification as read.

### PUT /notifications/mark-all-read/
Mark all notifications as read.

### DELETE /notifications/{id}/
Delete notification.

---

## Reports

### POST /reports/generate/
Generate report.

**Request Body:**
```json
{
  "type": "income_report",
  "filters": {
    "date_from": "2024-01-01",
    "date_to": "2024-12-31",
    "property_ids": [1, 2, 3]
  }
}
```

### GET /reports/history/
Get report generation history.

### GET /reports/{id}/download/
Download generated report.

---

## System Management

### GET /backups/
Get list of system backups.

### POST /backups/create/
Create new backup.

### GET /backups/{id}/download/
Download backup file.

### DELETE /backups/{id}/
Delete backup.

### GET /logs/
Get system logs (Admin only).

### GET /settings/
Get system settings.

### PUT /settings/
Update system settings.

---

## Error Handling

### Standard Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["This field is required"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

### HTTP Status Codes

- **200** - OK: Request successful
- **201** - Created: Resource created successfully
- **400** - Bad Request: Invalid request data
- **401** - Unauthorized: Authentication required
- **403** - Forbidden: Insufficient permissions
- **404** - Not Found: Resource not found
- **422** - Unprocessable Entity: Validation errors
- **500** - Internal Server Error: Server error

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - User must be authenticated
- `PERMISSION_DENIED` - User lacks required permissions
- `VALIDATION_ERROR` - Request data validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests

### Authentication Errors

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication credentials were not provided"
  }
}
```

### Validation Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "price": ["Price must be a positive number"],
      "bedrooms": ["Bedrooms must be at least 1"]
    }
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General requests**: 1000 requests per hour per user
- **Authentication requests**: 5 requests per minute per IP
- **File uploads**: 10 uploads per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Webhooks

VeriHome supports webhooks for real-time notifications:

### Supported Events
- `contract.created`
- `contract.updated` 
- `payment.completed`
- `payment.failed`
- `message.received`
- `service_request.created`

### Webhook Payload Example
```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "payment_id": 123,
    "contract_id": 45,
    "amount": 2500.00,
    "status": "completed"
  }
}
```

---

## SDK and Examples

### JavaScript/TypeScript Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Get properties
const properties = await api.get('/properties/');

// Create property
const newProperty = await api.post('/properties/', {
  title: 'New Property',
  price: 2000,
  // ... other fields
});
```

### Python Example

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Get properties
response = requests.get(
    'http://localhost:8000/api/v1/properties/',
    headers=headers
)
properties = response.json()

# Create property
property_data = {
    'title': 'New Property',
    'price': 2000,
    # ... other fields
}
response = requests.post(
    'http://localhost:8000/api/v1/properties/',
    json=property_data,
    headers=headers
)
```

---

## Postman Collection

A Postman collection with all API endpoints is available at:
`/docs/postman/VeriHome_API.postman_collection.json`

Import this collection to quickly test all API endpoints with example requests and responses.

---

*Last updated: 2024-01-01*  
*For technical support, contact: dev@verihome.com*