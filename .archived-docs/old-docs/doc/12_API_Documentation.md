# API Documentation - Phase 8 Part 4

## Overview

Complete API reference with security headers, rate limiting, and authentication requirements for the CEO Group Buying Platform.

**Generated**: 2026-02-12
**Status**: 🚀 COMPLETE
**Total Endpoints**: 50+

---

## OpenAPI/Swagger Specification

### Base Configuration

```yaml
openapi: 3.0.0
info:
  title: CEO Group Buying Platform API
  description: Secure REST API with comprehensive security features
  version: 1.0.0
  contact:
    name: API Support
    email: support@ceo.example.com

servers:
  - url: https://api.ceo.example.com
    description: Production server
  - url: https://staging-api.ceo.example.com
    description: Staging server

tags:
  - name: Authentication
    description: User authentication and session management
  - name: Products
    description: Product catalog and search
  - name: Orders
    description: Order management
  - name: Cart
    description: Shopping cart operations
  - name: Users
    description: User profile and account
  - name: Admin
    description: Admin-only endpoints
  - name: Health
    description: System health checks

securitySchemes:
  bearerAuth:
    type: http
    scheme: bearer
    bearerFormat: JWT
    description: JWT access token (15-minute expiry)

  csrfToken:
    type: apiKey
    in: header
    name: X-CSRF-Token
    description: CSRF protection token (required for state-changing requests)

  sessionCookie:
    type: apiKey
    in: cookie
    name: sessionId
    description: Session identifier
```

---

## Security Headers Reference

### Standard Response Headers (All Endpoints)

Every API response includes these security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://sentry.io; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
X-API-Version: 1.0.0
```

### CORS Headers (Cross-Origin Requests)

When request includes `Origin` header:

```
Access-Control-Allow-Origin: https://app.ceo.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With
Access-Control-Max-Age: 86400
Access-Control-Expose-Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After
```

### Rate Limit Headers

All rate-limited endpoints include:

```
X-RateLimit-Limit: <max-requests-per-window>
X-RateLimit-Remaining: <remaining-requests>
X-RateLimit-Reset: <unix-timestamp-reset>
```

When rate limit exceeded (HTTP 429):

```
Retry-After: <seconds-to-wait>
X-RateLimit-Limit: <max-requests>
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <unix-timestamp>
```

---

## Authentication Endpoints

### POST /api/auth/login

**Description**: User login with email and password

**Rate Limit**: 5 requests per 15 minutes (per IP)

**Security**:
- No CSRF protection (pre-auth endpoint)
- Input validation (email format, password length)
- Rate limiting enabled

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response** (200):
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Error Responses**:
- 400: Invalid email or password format
- 401: Invalid credentials
- 429: Rate limit exceeded

---

### POST /api/auth/register

**Description**: Create new user account

**Rate Limit**: 3 requests per hour (per IP)

**Security**:
- No CSRF protection (pre-auth endpoint)
- Email validation (valid format)
- Password validation (min 8 chars, complexity requirements)
- XSS/SQL injection detection
- Email verification required

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "passwordConfirm": "SecurePassword123!",
  "name": "Jane Doe",
  "acceptTerms": true
}
```

**Success Response** (201):
```json
{
  "user": {
    "id": "user-456",
    "email": "newuser@example.com",
    "name": "Jane Doe",
    "emailVerified": false
  },
  "message": "Registration successful. Check email for verification link."
}
```

**Error Responses**:
- 400: Invalid input
- 409: Email already registered
- 429: Rate limit exceeded

---

### POST /api/auth/logout

**Description**: Logout user and invalidate session

**Rate Limit**: No limit

**Security**:
- Requires authentication (JWT token)
- Requires CSRF token
- Clears session cookies
- Logs security event

**Request Headers**:
```
Authorization: Bearer <access-token>
X-CSRF-Token: <csrf-token>
```

**Success Response** (200):
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /api/auth/refresh

**Description**: Refresh expired access token

**Rate Limit**: No limit

**Security**:
- No CSRF required (pre-auth refresh)
- Uses refresh token (7-day expiry)
- Returns new access token
- Implements token rotation

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Error Responses**:
- 401: Invalid or expired refresh token
- 403: Refresh token rotation failure

---

### GET /api/auth/me

**Description**: Get current authenticated user

**Rate Limit**: No limit

**Security**:
- Requires authentication (JWT token)
- Returns only own user data
- Masked sensitive information

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Success Response** (200):
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer",
    "createdAt": "2026-01-15T10:30:00Z",
    "points": 1500
  }
}
```

---

### POST /api/auth/email/send-verify

**Description**: Send email verification link

**Rate Limit**: 5 requests per 10 minutes (per IP)

**Security**:
- Input validation (email format)
- Rate limiting enabled
- Generates one-time token
- Logged as security event

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response** (200):
```json
{
  "message": "Verification email sent. Check your inbox."
}
```

**Error Responses**:
- 400: Invalid email
- 404: User not found
- 429: Rate limit exceeded

---

### POST /api/auth/email/verify

**Description**: Verify email with token

**Rate Limit**: 10 requests per hour (per IP)

**Security**:
- Token validation (one-time use)
- Expires after 24 hours
- Prevents brute force
- Updates email verified status

**Request Body**:
```json
{
  "token": "verify_abc123xyz789..."
}
```

**Success Response** (200):
```json
{
  "message": "Email verified successfully",
  "user": {
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

---

### POST /api/auth/email/forgot

**Description**: Request password reset

**Rate Limit**: 3 requests per hour (per IP)

**Security**:
- Input validation (email format)
- Rate limiting to prevent abuse
- Generates one-time reset token
- Token expires in 1 hour

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response** (200):
```json
{
  "message": "Password reset link sent to email"
}
```

---

### POST /api/auth/email/reset

**Description**: Reset password with token

**Rate Limit**: 3 requests per hour (per IP)

**Security**:
- Token validation (one-time use)
- Password validation (complexity)
- Updates password hash (bcrypt)
- Invalidates all sessions
- Logs security event

**Request Body**:
```json
{
  "token": "reset_abc123xyz789...",
  "password": "NewPassword123!",
  "passwordConfirm": "NewPassword123!"
}
```

---

## Product Endpoints

### GET /api/products

**Description**: List all products with pagination and filtering

**Rate Limit**: 100 requests per minute (per user)

**Security**:
- Public endpoint (no auth required)
- Input validation (pagination, filters)
- SQL injection prevention
- Cached responses (5 minutes)

**Query Parameters**:
```
page=1              (default: 1)
limit=20            (default: 20, max: 100)
category=<id>       (optional)
search=<term>       (optional, max: 100 chars)
minPrice=<num>      (optional)
maxPrice=<num>      (optional)
sortBy=name|price   (optional)
```

**Success Response** (200):
```json
{
  "products": [
    {
      "id": "prod-123",
      "name": "Product Name",
      "description": "Product description",
      "price": 99.99,
      "category": "Electronics",
      "image": "https://cdn.example.com/images/prod-123.jpg",
      "inStock": true,
      "rating": 4.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 245,
    "pages": 13
  }
}
```

**Error Responses**:
- 400: Invalid query parameters
- 429: Rate limit exceeded

---

### GET /api/products/search

**Description**: Full-text search products

**Rate Limit**: 30 requests per minute (per user)

**Security**:
- Input validation (max 100 chars)
- XSS prevention on search term
- Results cached (2 minutes)
- Ranked by relevance

**Query Parameters**:
```
q=<search-term>     (required, min: 2 chars, max: 100 chars)
page=1              (optional)
limit=20            (optional)
```

**Success Response** (200):
```json
{
  "results": [
    {
      "id": "prod-123",
      "name": "Product Name",
      "price": 99.99,
      "relevance": 0.95
    }
  ],
  "totalResults": 42,
  "executionTime": 45
}
```

---

### GET /api/products/featured

**Description**: Get featured products

**Rate Limit**: 100 requests per minute

**Security**:
- Public endpoint
- Cached (1 hour)
- Returns hardcoded set
- No parameters accepted

**Success Response** (200):
```json
{
  "featured": [
    {
      "id": "prod-456",
      "name": "Featured Product",
      "price": 199.99,
      "featured": true
    }
  ]
}
```

---

### GET /api/products/latest

**Description**: Get recently added products

**Rate Limit**: 100 requests per minute

**Security**:
- Public endpoint
- Cached (30 minutes)
- Returns last 20 products

**Success Response** (200):
```json
{
  "latest": [
    {
      "id": "prod-789",
      "name": "New Product",
      "price": 149.99,
      "addedAt": "2026-02-10T15:30:00Z"
    }
  ]
}
```

---

### GET /api/products/:id

**Description**: Get product details

**Rate Limit**: 100 requests per minute

**Security**:
- Public endpoint
- Cached (30 minutes)
- Returns available products only
- Input validation (UUID format)

**Path Parameters**:
```
id=<product-id>     (required, UUID format)
```

**Success Response** (200):
```json
{
  "product": {
    "id": "prod-123",
    "name": "Product Name",
    "description": "Detailed description",
    "price": 99.99,
    "category": "Category",
    "specifications": {},
    "inStock": true,
    "stockCount": 50,
    "images": ["url1", "url2"],
    "rating": 4.5,
    "reviews": 120
  }
}
```

**Error Responses**:
- 404: Product not found

---

## Cart Endpoints

### GET /api/cart

**Description**: Get user's shopping cart

**Rate Limit**: 100 requests per minute

**Security**:
- Requires authentication (JWT)
- Returns only own cart
- CSRF optional (read operation)

**Request Headers**:
```
Authorization: Bearer <access-token>
```

**Success Response** (200):
```json
{
  "cart": {
    "id": "cart-123",
    "items": [
      {
        "productId": "prod-123",
        "quantity": 2,
        "price": 99.99,
        "subtotal": 199.98
      }
    ],
    "subtotal": 199.98,
    "tax": 15.99,
    "total": 215.97,
    "lastUpdated": "2026-02-12T10:30:00Z"
  }
}
```

---

### POST /api/cart

**Description**: Add item to cart

**Rate Limit**: 100 requests per minute

**Security**:
- Requires authentication (JWT)
- Requires CSRF token
- Input validation (product ID, quantity)
- Stock validation
- Prevents duplicate entries

**Request Headers**:
```
Authorization: Bearer <access-token>
X-CSRF-Token: <csrf-token>
```

**Request Body**:
```json
{
  "productId": "prod-123",
  "quantity": 2
}
```

**Success Response** (201):
```json
{
  "cart": {
    "id": "cart-123",
    "items": 5,
    "total": 500.00
  }
}
```

**Error Responses**:
- 400: Invalid input
- 404: Product not found
- 409: Insufficient stock

---

### PUT /api/cart/:id

**Description**: Update cart item quantity

**Rate Limit**: 100 requests per minute

**Security**:
- Requires authentication
- Requires CSRF token
- Validates ownership
- Stock validation

**Request Body**:
```json
{
  "quantity": 3
}
```

**Success Response** (200):
```json
{
  "item": {
    "productId": "prod-123",
    "quantity": 3,
    "subtotal": 299.97
  }
}
```

---

### DELETE /api/cart/:id

**Description**: Remove item from cart

**Rate Limit**: 100 requests per minute

**Security**:
- Requires authentication
- Requires CSRF token
- Validates ownership

---

## Order Endpoints

### GET /api/orders

**Description**: List user's orders

**Rate Limit**: 100 requests per minute

**Security**:
- Requires authentication
- Returns only own orders
- Pagination enabled
- Cached (5 minutes)

**Query Parameters**:
```
page=1              (optional)
limit=20            (optional)
status=pending|completed|cancelled  (optional)
```

**Success Response** (200):
```json
{
  "orders": [
    {
      "id": "order-123",
      "createdAt": "2026-02-10T10:30:00Z",
      "status": "completed",
      "total": 215.97,
      "items": 5
    }
  ],
  "pagination": {
    "page": 1,
    "total": 15
  }
}
```

---

### POST /api/orders

**Description**: Create new order from cart

**Rate Limit**: 20 requests per hour

**Security**:
- Requires authentication (JWT)
- Requires CSRF token
- Validates cart contents
- Prevents duplicate orders (idempotency key)
- Inventory check before creation
- Logged as business event

**Request Headers**:
```
Authorization: Bearer <access-token>
X-CSRF-Token: <csrf-token>
Idempotency-Key: <uuid>
```

**Request Body**:
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "City",
    "country": "Country",
    "postalCode": "12345"
  },
  "paymentMethod": "credit_card"
}
```

**Success Response** (201):
```json
{
  "order": {
    "id": "order-456",
    "status": "pending",
    "total": 215.97,
    "items": 5,
    "createdAt": "2026-02-12T10:30:00Z"
  }
}
```

**Error Responses**:
- 400: Invalid input
- 409: Insufficient inventory
- 429: Rate limit exceeded

---

### GET /api/orders/:id

**Description**: Get order details

**Rate Limit**: 100 requests per minute

**Security**:
- Requires authentication
- Validates ownership
- Returns full order with items
- Cached (10 minutes)

**Success Response** (200):
```json
{
  "order": {
    "id": "order-123",
    "status": "completed",
    "items": [
      {
        "productId": "prod-123",
        "quantity": 2,
        "price": 99.99
      }
    ],
    "subtotal": 199.98,
    "tax": 15.99,
    "total": 215.97,
    "shippingAddress": {},
    "createdAt": "2026-02-10T10:30:00Z"
  }
}
```

---

## User Profile Endpoints

### GET /api/user/profile

**Description**: Get user profile

**Rate Limit**: 100 requests per minute

**Security**:
- Requires authentication
- Returns only own data
- Masks sensitive information

**Success Response** (200):
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "points": 1500,
    "totalOrders": 15,
    "memberSince": "2025-06-15T10:30:00Z"
  }
}
```

---

### PUT /api/user/profile

**Description**: Update user profile

**Rate Limit**: 50 requests per hour

**Security**:
- Requires authentication
- Requires CSRF token
- Input validation
- Email change requires verification
- Password change requires old password
- Logged as security event

**Request Body**:
```json
{
  "name": "John Updated",
  "phone": "+1-555-0123"
}
```

---

## Admin Endpoints

### GET /api/admin/dashboard

**Description**: Admin dashboard metrics

**Rate Limit**: 50 requests per minute

**Security**:
- Requires authentication with admin role
- Requires CSRF token
- Returns aggregated metrics only
- Cached (5 minutes)
- Logged as admin activity

**Success Response** (200):
```json
{
  "dashboard": {
    "totalUsers": 5000,
    "totalOrders": 15000,
    "totalRevenue": 500000,
    "ordersToday": 45,
    "revenueToday": 5000
  }
}
```

---

### GET /api/admin/products

**Description**: Admin product list with all details

**Rate Limit**: 50 requests per minute

**Security**:
- Requires admin role
- No caching
- Returns including hidden/archived

---

### POST /api/admin/products

**Description**: Create new product

**Rate Limit**: 20 requests per hour

**Security**:
- Requires admin role
- Input validation (all fields)
- File upload validation (images)
- Requires CSRF token
- Logged as admin action

---

### PUT /api/admin/products/:id

**Description**: Update product

**Rate Limit**: 50 requests per minute

**Security**:
- Requires admin role
- Validates product ownership
- Input validation
- CSRF required
- Audit logged

---

### DELETE /api/admin/products/:id

**Description**: Delete/archive product

**Rate Limit**: 20 requests per hour

**Security**:
- Requires admin role
- Soft delete (archive, not permanent)
- CSRF required
- Audit logged with reason

---

## Health Endpoints

### GET /api/health

**Description**: System health check

**Rate Limit**: 1000 requests per minute (high limit for monitoring)

**Security**:
- Public endpoint
- No authentication required
- No CSRF required
- Cached (10 seconds)
- Excluded from general rate limiting
- Monitored by uptime services

**Success Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T10:30:00Z",
  "uptime": 864000,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "email": "ok"
  }
}
```

**Service Unavailable Response** (503):
```json
{
  "status": "error",
  "message": "Database connection failed",
  "timestamp": "2026-02-12T10:30:00Z"
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "error details..."
    }
  },
  "timestamp": "2026-02-12T10:30:00Z",
  "path": "/api/endpoint",
  "requestId": "req-uuid-here"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Input validation failed |
| `INVALID_TOKEN` | 401 | JWT token invalid or expired |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `CSRF_TOKEN_MISSING` | 403 | CSRF token missing |
| `CSRF_TOKEN_INVALID` | 403 | CSRF token invalid |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `UNPROCESSABLE_ENTITY` | 422 | Validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting Configuration

### Per-Endpoint Limits

| Endpoint Group | Limit | Window | Context |
|---|---|---|---|
| **Authentication** |
| POST /api/auth/login | 5 | 15 min | Per IP |
| POST /api/auth/register | 3 | 1 hour | Per IP |
| POST /api/auth/email/send-verify | 5 | 10 min | Per IP |
| POST /api/auth/email/verify | 10 | 1 hour | Per IP |
| POST /api/auth/email/forgot | 3 | 1 hour | Per IP |
| POST /api/auth/email/reset | 3 | 1 hour | Per IP |
| **Products** |
| GET /api/products | 100 | 1 min | Per user |
| GET /api/products/search | 30 | 1 min | Per user |
| GET /api/products/* | 100 | 1 min | Per user |
| **Orders** |
| POST /api/orders | 20 | 1 hour | Per user |
| GET /api/orders* | 100 | 1 min | Per user |
| **Cart** |
| POST /api/cart | 100 | 1 min | Per user |
| PUT /api/cart/:id | 100 | 1 min | Per user |
| **User Profile** |
| PUT /api/user/profile | 50 | 1 hour | Per user |
| **Admin** |
| POST /api/admin/* | 20 | 1 hour | Per admin |
| PUT /api/admin/* | 50 | 1 min | Per admin |
| DELETE /api/admin/* | 20 | 1 hour | Per admin |
| **Health** |
| GET /api/health | 1000 | 1 min | Per IP |

---

## Request/Response Examples

### Successful Request Flow

**1. Login Request**
```bash
curl -X POST https://api.ceo.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response Headers**:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1644595200
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

**Response Body**:
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**2. Add to Cart Request** (With CSRF Protection)
```bash
curl -X POST https://api.ceo.example.com/api/cart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-CSRF-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-123",
    "quantity": 2
  }'
```

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1644595200
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

**3. Rate Limit Exceeded Response**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 300
  }
}
```

**Response Headers**:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 300
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1644595200
```

---

## Authentication & Authorization

### JWT Token Format

**Access Token (15-minute expiry)**:
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "role": "customer",
  "type": "access",
  "iat": 1644591600,
  "exp": 1644592500
}
```

**Refresh Token (7-day expiry)**:
```json
{
  "sub": "user-123",
  "type": "refresh",
  "iat": 1644591600,
  "exp": 1645196400
}
```

### Token Usage

**Include in Request Headers**:
```
Authorization: Bearer <access-token>
```

**Refresh Token Flow**:
1. Access token expires or approaching expiration
2. Client calls POST /api/auth/refresh with refresh token
3. Server returns new access token
4. Client uses new token for requests

---

## CORS Configuration

### Allowed Origins

```
https://app.ceo.example.com
https://www.ceo.example.com
https://mobile.ceo.example.com
```

### Allowed Methods

```
GET, POST, PUT, DELETE, PATCH, OPTIONS
```

### Allowed Headers

```
Authorization
Content-Type
X-CSRF-Token
X-Requested-With
Accept
Accept-Language
Content-Language
```

### Credentials

```
Cookie-based sessions: allowed
Cross-origin credentials: allowed for trusted origins only
```

---

## Security Best Practices

### For Clients

1. **Always use HTTPS** - Never send tokens over HTTP
2. **Store tokens securely** - Use httpOnly cookies or secure storage
3. **Include CSRF tokens** - Required for state-changing requests
4. **Validate responses** - Check HTTP status and error codes
5. **Handle rate limits** - Respect X-RateLimit headers and Retry-After
6. **Log security events** - Track failed authentications and unusual activity
7. **Implement timeout** - Refresh or re-login before token expiration
8. **Clear sensitive data** - Remove tokens on logout

### For API Consumers

1. **Verify SSL certificates** - Use certificate pinning for mobile apps
2. **Use API keys securely** - Never commit keys to version control
3. **Implement exponential backoff** - For rate limit retries
4. **Monitor error rates** - Alert on authentication failures
5. **Implement circuit breakers** - Handle API unavailability gracefully
6. **Log request/response metadata** - For debugging and auditing

---

## Pagination

### Standard Pagination Parameters

```
page=1              (1-based page number, default: 1)
limit=20            (items per page, default: 20, max: 100)
```

### Pagination Response Format

```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 245,
    "pages": 13,
    "hasMore": true,
    "nextPage": 2,
    "prevPage": null
  }
}
```

---

## Filtering & Sorting

### Common Query Parameters

```
sort=name           (field to sort by)
order=asc|desc      (sort order, default: asc)
search=term         (full-text search term)
filter[field]=value (field-specific filters)
```

### Example Requests

```bash
# Get products sorted by price
GET /api/products?sort=price&order=desc&limit=20

# Search with filters
GET /api/products?search=electronics&filter[category]=Electronics&limit=10

# Paginated orders
GET /api/orders?page=2&limit=50&sort=createdAt&order=desc
```

---

## Performance Optimization

### Caching Strategy

| Endpoint | Cache Duration | Reason |
|---|---|---|
| GET /api/products | 5 min | Public product catalog |
| GET /api/products/:id | 30 min | Product details |
| GET /api/products/featured | 1 hour | Rarely changes |
| GET /api/products/latest | 30 min | Recently updated |
| GET /api/health | 10 sec | Monitor service status |
| GET /api/orders | 5 min | User-specific data |
| GET /api/user/profile | 1 min | Current user data |

### Compression

- All responses gzip-compressed (default)
- Threshold: 1 KB minimum
- CORS-compatible

### Connection Pooling

- PostgreSQL: 20 connections (default)
- Redis: Connection pooling enabled
- API clients: Keep-Alive enabled

---

## Webhook Events (Future)

Planned webhook events for order updates:

```
order.created
order.confirmed
order.shipped
order.delivered
order.cancelled
payment.completed
payment.failed
user.registered
user.email_verified
```

---

## Versioning

**Current API Version**: 1.0.0

**Versioning Strategy**: URL-based versioning (planned for v2+)

```
/api/v1/products     (current)
/api/v2/products     (future)
```

---

## Support & Resources

- **API Base URL**: https://api.ceo.example.com
- **API Key**: Required for production access
- **Documentation**: https://docs.ceo.example.com/api
- **Status Page**: https://status.ceo.example.com
- **Support Email**: api-support@ceo.example.com

---

**Last Updated**: 2026-02-12
**Version**: 1.0.0 (Phase 8 Part 4)
**Status**: ✅ Complete and Production Ready
