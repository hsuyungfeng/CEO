# Phase 4 Payment System - API Testing Guide

> **Comprehensive manual testing guide for all 9 invoice management API endpoints**

**Test Environment:** Local development server (http://localhost:3000)

**Prerequisite Setup:**
```bash
npm run dev  # Start development server
npm run db:seed  # Seed test data (users, orders, etc.)
```

---

## Authentication Setup

### 1. Get Authentication Token (NextAuth Session)

**For Web Client (Session-based):**
```bash
# Login via UI at http://localhost:3000/login
# Session cookie automatically included in subsequent requests
```

**For Mobile/API Client (Bearer Token):**
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "user": { "id": "...", "email": "employee@example.com", "role": "EMPLOYEE" },
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }
```

**Store token for subsequent requests:**
```bash
export BEARER_TOKEN="<token_from_response>"
export USER_BEARER_TOKEN="<employee_token>"
export ADMIN_TOKEN="<admin_token>"
```

---

## Test Data Setup

### Create Test Users

```bash
# Admin user (existing)
# Email: admin@example.com, Role: ADMIN

# Employee user 1
# Email: emp1@example.com, Role: EMPLOYEE

# Employee user 2
# Email: emp2@example.com, Role: EMPLOYEE
```

### Create Test Orders

```bash
# For each employee, create 2-3 MONTHLY_BILLING orders in the previous month:

# Order 1: 5000 NT$ worth product
# Order 2: 3000 NT$ worth product
# paymentMethod: MONTHLY_BILLING
# orderDate: Last month (e.g., 2026-01-15)
```

---

## API Endpoint Testing

### USER ENDPOINTS (4 endpoints)

---

#### **Endpoint 1: GET /api/invoices**
**Purpose:** Fetch invoices for the current authenticated user with optional filtering

**Request:**
```bash
curl -X GET "http://localhost:3000/api/invoices?status=DRAFT&month=2026-02" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```

**Query Parameters:**
- `status` (optional): Filter by status - DRAFT, SENT, CONFIRMED, PAID
- `month` (optional): Filter by billing month - format YYYY-MM

**Expected Response (200 OK):**
```json
{
  "invoices": [
    {
      "id": "inv_001",
      "invoiceNo": "INV-2026-02-001",
      "userId": "user_123",
      "billingMonth": "2026-02",
      "totalAmount": "8000.00",
      "status": "DRAFT",
      "createdAt": "2026-02-28T10:00:00Z",
      "sentAt": null,
      "confirmedAt": null,
      "paidAt": null,
      "lineItems": [
        {
          "id": "line_001",
          "orderId": "order_123",
          "productName": "Product A",
          "quantity": 100,
          "unitPrice": "50.00",
          "subtotal": "5000.00"
        }
      ]
    }
  ],
  "total": 1,
  "count": 1
}
```

**Test Cases:**

✅ **Test 1.1: List all invoices for current user**
```bash
curl -X GET "http://localhost:3000/api/invoices" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns all invoices for authenticated user (200)
- Verify: Only user's own invoices returned, no other users' invoices

✅ **Test 1.2: Filter by status=DRAFT**
```bash
curl -X GET "http://localhost:3000/api/invoices?status=DRAFT" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns only DRAFT status invoices (200)
- Verify: All returned invoices have status="DRAFT"

✅ **Test 1.3: Filter by billing month**
```bash
curl -X GET "http://localhost:3000/api/invoices?month=2026-02" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns invoices for February 2026 only (200)
- Verify: billingMonth="2026-02" in all results

✅ **Test 1.4: Invalid status filter**
```bash
curl -X GET "http://localhost:3000/api/invoices?status=INVALID" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns 400 Bad Request or ignores invalid filter

✅ **Test 1.5: Unauthenticated request**
```bash
curl -X GET "http://localhost:3000/api/invoices"
```
- Expected: Returns 401 Unauthorized

✅ **Test 1.6: Multiple filters combined**
```bash
curl -X GET "http://localhost:3000/api/invoices?status=SENT&month=2026-02" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns invoices matching both filters (200)

✅ **Test 1.7: Empty results**
```bash
curl -X GET "http://localhost:3000/api/invoices?month=2025-01" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns empty array (200)

**Performance Check:**
- Response time should be < 200ms
- Measure: `time curl -X GET "http://localhost:3000/api/invoices" ...`

---

#### **Endpoint 2: GET /api/invoices/[id]**
**Purpose:** Fetch detailed information for a specific invoice

**Request:**
```bash
curl -X GET "http://localhost:3000/api/invoices/inv_001" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "id": "inv_001",
  "invoiceNo": "INV-2026-02-001",
  "userId": "user_123",
  "billingMonth": "2026-02",
  "totalAmount": "8000.00",
  "status": "SENT",
  "sentAt": "2026-02-28T11:00:00Z",
  "confirmedAt": null,
  "paidAt": null,
  "createdAt": "2026-02-28T10:00:00Z",
  "user": {
    "id": "user_123",
    "email": "emp1@example.com",
    "name": "Employee One"
  },
  "lineItems": [
    {
      "id": "line_001",
      "orderId": "order_123",
      "productName": "Product A",
      "quantity": 100,
      "unitPrice": "50.00",
      "subtotal": "5000.00"
    },
    {
      "id": "line_002",
      "orderId": "order_124",
      "productName": "Product B",
      "quantity": 60,
      "unitPrice": "50.00",
      "subtotal": "3000.00"
    }
  ]
}
```

**Test Cases:**

✅ **Test 2.1: Get invoice details**
```bash
curl -X GET "http://localhost:3000/api/invoices/inv_001" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns full invoice with line items (200)
- Verify: All line items are present, totalAmount = sum of subtotals

✅ **Test 2.2: Access own invoice**
```bash
# emp1@example.com accessing their own invoice
curl -X GET "http://localhost:3000/api/invoices/inv_001" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns invoice (200)

✅ **Test 2.3: Cannot access other user's invoice**
```bash
# emp2@example.com trying to access emp1's invoice
curl -X GET "http://localhost:3000/api/invoices/inv_001" \
  -H "Authorization: Bearer $OTHER_USER_TOKEN"
```
- Expected: Returns 403 Forbidden or 404 Not Found

✅ **Test 2.4: Admin can access any invoice**
```bash
# admin@example.com accessing employee invoice
curl -X GET "http://localhost:3000/api/invoices/inv_001" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns invoice (200)

✅ **Test 2.5: Non-existent invoice**
```bash
curl -X GET "http://localhost:3000/api/invoices/inv_nonexistent" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns 404 Not Found

✅ **Test 2.6: Invalid invoice ID format**
```bash
curl -X GET "http://localhost:3000/api/invoices/invalid-id-format" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns 404 Not Found or 400 Bad Request

✅ **Test 2.7: Unauthenticated request**
```bash
curl -X GET "http://localhost:3000/api/invoices/inv_001"
```
- Expected: Returns 401 Unauthorized

**Performance Check:**
- Response time should be < 200ms
- Measure: `time curl -X GET "http://localhost:3000/api/invoices/inv_001" ...`

---

#### **Endpoint 3: PATCH /api/invoices/[id]/confirm**
**Purpose:** Employee confirms receipt of an invoice (transitions SENT → CONFIRMED)

**Request:**
```bash
curl -X PATCH "http://localhost:3000/api/invoices/inv_001/confirm" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (200 OK):**
```json
{
  "id": "inv_001",
  "status": "CONFIRMED",
  "confirmedAt": "2026-02-28T14:00:00Z"
}
```

**Test Cases:**

✅ **Test 3.1: Employee confirms their own SENT invoice**
```bash
curl -X PATCH "http://localhost:3000/api/invoices/inv_001/confirm" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Status changes to CONFIRMED, confirmedAt timestamp set (200)
- Verify: GET endpoint confirms status changed

✅ **Test 3.2: Cannot confirm DRAFT invoice**
```bash
# Create a DRAFT invoice, try to confirm it
curl -X PATCH "http://localhost:3000/api/invoices/inv_draft/confirm" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 400 Bad Request (invalid state transition)

✅ **Test 3.3: Cannot confirm already CONFIRMED invoice**
```bash
# Try to confirm invoice that's already CONFIRMED
curl -X PATCH "http://localhost:3000/api/invoices/inv_confirmed/confirm" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 400 Bad Request (idempotent or state error)

✅ **Test 3.4: Cannot confirm PAID invoice**
```bash
curl -X PATCH "http://localhost:3000/api/invoices/inv_paid/confirm" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 400 Bad Request

✅ **Test 3.5: Cannot confirm other user's invoice**
```bash
# emp2 trying to confirm emp1's invoice
curl -X PATCH "http://localhost:3000/api/invoices/inv_001/confirm" \
  -H "Authorization: Bearer $OTHER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 403 Forbidden

✅ **Test 3.6: Admin can confirm any invoice**
```bash
curl -X PATCH "http://localhost:3000/api/invoices/inv_001/confirm" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 200 OK

✅ **Test 3.7: Unauthenticated request**
```bash
curl -X PATCH "http://localhost:3000/api/invoices/inv_001/confirm" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 401 Unauthorized

**Performance Check:**
- Response time should be < 200ms

---

#### **Endpoint 4: POST /api/invoices/[id]/mark-paid**
**Purpose:** Employee marks their invoice as paid (transitions CONFIRMED → PAID)

**Request:**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```

**Expected Response (200 OK):**
```json
{
  "id": "inv_001",
  "status": "PAID",
  "paidAt": "2026-02-28T15:00:00Z",
  "paymentMethod": "CASH",
  "paymentDate": "2026-02-28"
}
```

**Test Cases:**

✅ **Test 4.1: Employee marks CONFIRMED invoice as paid with CASH**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Status changes to PAID, paidAt set (200)
- Verify: Payment method recorded correctly

✅ **Test 4.2: Cannot mark DRAFT invoice as paid**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_draft/mark-paid" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 400 Bad Request

✅ **Test 4.3: Cannot mark other user's invoice as paid**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $OTHER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 403 Forbidden

✅ **Test 4.4: Admin can mark any invoice as paid**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 200 OK

✅ **Test 4.5: Missing required fields**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 400 Bad Request

✅ **Test 4.6: Invalid payment method**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "INVALID_METHOD",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 400 Bad Request

✅ **Test 4.7: Unauthenticated request**
```bash
curl -X POST "http://localhost:3000/api/invoices/inv_001/mark-paid" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 401 Unauthorized

**Performance Check:**
- Response time should be < 200ms

---

### ADMIN ENDPOINTS (5 endpoints)

---

#### **Endpoint 5: POST /api/admin/invoices/generate**
**Purpose:** Generate monthly invoices for all employees with MONTHLY_BILLING orders

**Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```

**Expected Response (200 OK):**
```json
{
  "generated": 2,
  "invoices": [
    {
      "id": "inv_001",
      "invoiceNo": "INV-2026-02-001",
      "userId": "user_123",
      "billingMonth": "2026-02",
      "totalAmount": "8000.00",
      "status": "DRAFT",
      "lineItemCount": 2
    },
    {
      "id": "inv_002",
      "invoiceNo": "INV-2026-02-002",
      "userId": "user_124",
      "billingMonth": "2026-02",
      "totalAmount": "5000.00",
      "status": "DRAFT",
      "lineItemCount": 1
    }
  ]
}
```

**Test Cases:**

✅ **Test 5.1: Admin generates invoices for valid month**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```
- Expected: Creates DRAFT invoices for all users with orders (200)
- Verify: Only users with MONTHLY_BILLING orders in that month included

✅ **Test 5.2: Invalid billing month format**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "invalid-date"
  }'
```
- Expected: Returns 400 Bad Request

✅ **Test 5.3: Future billing month**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2099-12"
  }'
```
- Expected: Returns 200 OK (or 400, depends on business logic)
- Verify: Created invoices if any orders exist for that month

✅ **Test 5.4: Non-admin cannot generate**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/generate" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```
- Expected: Returns 403 Forbidden

✅ **Test 5.5: Unauthenticated request**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```
- Expected: Returns 401 Unauthorized

✅ **Test 5.6: Idempotency - generate same month twice**
```bash
# Generate once
curl -X POST "http://localhost:3000/api/admin/invoices/generate" ...
# Generate again for same month
curl -X POST "http://localhost:3000/api/admin/invoices/generate" ...
```
- Expected: Second call either returns 200 (creates new) or 409 Conflict (already exists)
- Verify: No duplicate invoices created

✅ **Test 5.7: Missing billingMonth field**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/generate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 400 Bad Request

**Performance Check:**
- Response time should be < 500ms (may take longer due to aggregation)
- Measure: `time curl -X POST "http://localhost:3000/api/admin/invoices/generate" ...`

---

#### **Endpoint 6: POST /api/admin/invoices/send-all**
**Purpose:** Send all DRAFT invoices for a month to employees

**Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```

**Expected Response (200 OK):**
```json
{
  "sent": 2,
  "invoices": [
    {
      "id": "inv_001",
      "invoiceNo": "INV-2026-02-001",
      "status": "SENT",
      "sentAt": "2026-02-28T11:00:00Z"
    },
    {
      "id": "inv_002",
      "invoiceNo": "INV-2026-02-002",
      "status": "SENT",
      "sentAt": "2026-02-28T11:00:00Z"
    }
  ]
}
```

**Test Cases:**

✅ **Test 6.1: Admin sends all DRAFT invoices**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```
- Expected: Changes all DRAFT → SENT, sets sentAt (200)
- Verify: Only DRAFT invoices affected, others untouched

✅ **Test 6.2: Invalid billing month format**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "02-2026"
  }'
```
- Expected: Returns 400 Bad Request

✅ **Test 6.3: Send when no DRAFT invoices exist**
```bash
# Try to send for a month with no invoices or all already sent
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2020-01"
  }'
```
- Expected: Returns 200 OK with sent=0

✅ **Test 6.4: Non-admin cannot send**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```
- Expected: Returns 403 Forbidden

✅ **Test 6.5: Unauthenticated request**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" \
  -H "Content-Type: application/json" \
  -d '{
    "billingMonth": "2026-02"
  }'
```
- Expected: Returns 401 Unauthorized

✅ **Test 6.6: Idempotency - send twice**
```bash
# Send all drafts
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" ...
# Send again
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" ...
```
- Expected: Second call returns 200 with sent=0 (no drafts to send)

✅ **Test 6.7: Missing billingMonth field**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/send-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 400 Bad Request

**Performance Check:**
- Response time should be < 500ms
- Measure: `time curl -X POST "http://localhost:3000/api/admin/invoices/send-all" ...`

---

#### **Endpoint 7: GET /api/admin/invoices**
**Purpose:** Fetch all invoices with admin filtering and pagination

**Request:**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?status=SENT&billingMonth=2026-02&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Query Parameters:**
- `status` (optional): Filter by status - DRAFT, SENT, CONFIRMED, PAID
- `billingMonth` (optional): Filter by billing month - YYYY-MM format
- `userId` (optional): Filter by specific user
- `page` (optional): Page number (1-based, default 1)
- `limit` (optional): Records per page (default 10, max 100)

**Expected Response (200 OK):**
```json
{
  "invoices": [
    {
      "id": "inv_001",
      "invoiceNo": "INV-2026-02-001",
      "user": {
        "id": "user_123",
        "email": "emp1@example.com",
        "name": "Employee One"
      },
      "billingMonth": "2026-02",
      "totalAmount": "8000.00",
      "status": "SENT",
      "createdAt": "2026-02-28T10:00:00Z",
      "sentAt": "2026-02-28T11:00:00Z",
      "confirmedAt": null,
      "paidAt": null,
      "lineItemCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

**Test Cases:**

✅ **Test 7.1: Fetch all invoices (no filters)**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns all invoices with pagination (200)
- Verify: Default page=1, limit=10

✅ **Test 7.2: Filter by status**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?status=SENT" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns only SENT invoices (200)
- Verify: All returned have status="SENT"

✅ **Test 7.3: Filter by billing month**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?billingMonth=2026-02" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns invoices for that month (200)
- Verify: All returned have billingMonth="2026-02"

✅ **Test 7.4: Filter by specific user**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?userId=user_123" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns invoices only for user_123 (200)

✅ **Test 7.5: Pagination - fetch second page**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?page=2&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns page 2 with 5 records (200)
- Verify: pagination.page=2, pagination.totalPages correct

✅ **Test 7.6: Pagination - limit too large**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?limit=1000" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns 400 or caps limit at max (e.g., 100)

✅ **Test 7.7: Invalid status filter**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?status=INVALID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns 400 Bad Request or ignores

✅ **Test 7.8: Invalid billing month format**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?billingMonth=invalid" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns 400 Bad Request or empty results

✅ **Test 7.9: Non-admin cannot fetch**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN"
```
- Expected: Returns 403 Forbidden

✅ **Test 7.10: Unauthenticated request**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices"
```
- Expected: Returns 401 Unauthorized

✅ **Test 7.11: Multiple filters combined**
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?status=SENT&billingMonth=2026-02&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
- Expected: Returns invoices matching all filters (200)

**Performance Check:**
- Response time should be < 200ms
- Large page (limit=100): should be < 500ms

---

#### **Endpoint 8: PATCH /api/admin/invoices/[id]**
**Purpose:** Admin updates invoice details (optional endpoint for future use)

**Request:**
```bash
curl -X PATCH "http://localhost:3000/api/admin/invoices/inv_001" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```

**Expected Response (200 OK):**
```json
{
  "id": "inv_001",
  "status": "CONFIRMED",
  "confirmedAt": "2026-02-28T14:00:00Z"
}
```

**Test Cases:**

✅ **Test 8.1: Admin updates invoice status**
```bash
curl -X PATCH "http://localhost:3000/api/admin/invoices/inv_001" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```
- Expected: Updates status and timestamp (200)

✅ **Test 8.2: Non-admin cannot update**
```bash
curl -X PATCH "http://localhost:3000/api/admin/invoices/inv_001" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```
- Expected: Returns 403 Forbidden

✅ **Test 8.3: Invalid status value**
```bash
curl -X PATCH "http://localhost:3000/api/admin/invoices/inv_001" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "INVALID"
  }'
```
- Expected: Returns 400 Bad Request

✅ **Test 8.4: Unauthenticated request**
```bash
curl -X PATCH "http://localhost:3000/api/admin/invoices/inv_001" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```
- Expected: Returns 401 Unauthorized

**Performance Check:**
- Response time should be < 200ms

---

#### **Endpoint 9: POST /api/admin/invoices/[id]/mark-paid**
**Purpose:** Admin marks any invoice as paid (administrative override)

**Request:**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28",
    "notes": "Received check on 2/28"
  }'
```

**Expected Response (200 OK):**
```json
{
  "id": "inv_001",
  "status": "PAID",
  "paidAt": "2026-02-28T16:00:00Z",
  "paymentMethod": "CASH",
  "paymentDate": "2026-02-28",
  "notes": "Received check on 2/28"
}
```

**Test Cases:**

✅ **Test 9.1: Admin marks invoice as paid**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Marks PAID regardless of current status (200)
- Verify: paidAt timestamp set

✅ **Test 9.2: Admin can mark any invoice (even DRAFT)**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_draft/mark-paid" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 200 OK (admin override)

✅ **Test 9.3: Non-admin cannot mark as paid**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $USER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 403 Forbidden

✅ **Test 9.4: With optional notes field**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28",
    "notes": "Payment received via wire transfer"
  }'
```
- Expected: Stores notes if supported (200)

✅ **Test 9.5: Missing required fields**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- Expected: Returns 400 Bad Request

✅ **Test 9.6: Invalid payment method**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_001/mark-paid" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "INVALID",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 400 Bad Request

✅ **Test 9.7: Unauthenticated request**
```bash
curl -X POST "http://localhost:3000/api/admin/invoices/inv_001/mark-paid" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CASH",
    "paymentDate": "2026-02-28"
  }'
```
- Expected: Returns 401 Unauthorized

**Performance Check:**
- Response time should be < 200ms

---

## Authorization Matrix Summary

| Endpoint | User | Admin | Notes |
|----------|------|-------|-------|
| GET /api/invoices | Own only | All | User can see their invoices; admin sees all |
| GET /api/invoices/[id] | Own only | All | User can view their invoice; admin can view any |
| PATCH /api/invoices/[id]/confirm | Own only | All | User confirms their own; admin can confirm any |
| POST /api/invoices/[id]/mark-paid | Own only | All | User marks their own; admin can mark any |
| POST /api/admin/invoices/generate | ❌ | ✅ | Admin only |
| POST /api/admin/invoices/send-all | ❌ | ✅ | Admin only |
| GET /api/admin/invoices | ❌ | ✅ | Admin only |
| PATCH /api/admin/invoices/[id] | ❌ | ✅ | Admin only |
| POST /api/admin/invoices/[id]/mark-paid | ❌ | ✅ | Admin only |

---

## Quick Test Script

**Save as `test_endpoints.sh` and run all tests:**

```bash
#!/bin/bash

echo "=== Phase 4 API Endpoint Testing ==="

# Setup tokens
export ADMIN_TOKEN="<admin_bearer_token>"
export USER_TOKEN="<user_bearer_token>"
export OTHER_USER_TOKEN="<other_user_bearer_token>"

# Test counters
PASS=0
FAIL=0

# Helper function
test_endpoint() {
  local name=$1
  local cmd=$2
  local expected=$3

  echo -n "Testing: $name ... "
  response=$(eval "$cmd" 2>&1)

  if echo "$response" | grep -q "$expected"; then
    echo "✅ PASS"
    ((PASS++))
  else
    echo "❌ FAIL"
    echo "  Expected: $expected"
    echo "  Got: $response"
    ((FAIL++))
  fi
}

# Run tests
test_endpoint "GET /api/invoices" \
  'curl -s -X GET "http://localhost:3000/api/invoices" -H "Authorization: Bearer $USER_TOKEN"' \
  "invoices"

test_endpoint "GET /api/invoices/inv_001" \
  'curl -s -X GET "http://localhost:3000/api/invoices/inv_001" -H "Authorization: Bearer $USER_TOKEN"' \
  "invoiceNo"

# ... more tests ...

echo ""
echo "=== Test Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
```

---

## Performance Baseline

**Expected response times:**

| Endpoint | Target | Notes |
|----------|--------|-------|
| GET /api/invoices | < 200ms | Simple fetch with filters |
| GET /api/invoices/[id] | < 200ms | Single invoice + line items |
| PATCH /api/invoices/[id]/confirm | < 200ms | Status update only |
| POST /api/invoices/[id]/mark-paid | < 200ms | Status + payment update |
| POST /api/admin/invoices/generate | < 500ms | Aggregation required |
| POST /api/admin/invoices/send-all | < 500ms | Bulk update |
| GET /api/admin/invoices | < 200ms | List with filters |
| PATCH /api/admin/invoices/[id] | < 200ms | Status update |
| POST /api/admin/invoices/[id]/mark-paid | < 200ms | Status update |

**Measurement command:**
```bash
time curl -X GET "http://localhost:3000/api/invoices" \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## Verification Checklist

- [ ] All 9 endpoints return correct status codes
- [ ] Authentication properly enforced (401 for missing token)
- [ ] Authorization properly enforced (403 for insufficient permissions)
- [ ] User can only access their own invoices
- [ ] Admin can access all invoices
- [ ] Status transitions follow state machine (DRAFT → SENT → CONFIRMED → PAID)
- [ ] All required fields validated
- [ ] Invalid input rejected with 400 Bad Request
- [ ] All timestamps correctly recorded
- [ ] All response times < 500ms
- [ ] Pagination works correctly
- [ ] Filtering works correctly
- [ ] No data leakage between users
- [ ] Idempotent operations work safely

---

**Last Updated:** 2026-02-28
**Next Step:** Task 12 - Update Documentation and DailyProgress
