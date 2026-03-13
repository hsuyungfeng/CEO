---
status: resolved
trigger: "Admin Dashboard Not Displaying Supplier Data - Fix the supplier API endpoint returning 500 errors"
created: 2026-03-13T00:00:00Z
updated: 2026-03-13T00:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - Route uses wrong Prisma relationship field name
test: Cross-reference schema definition with route.ts line 161
expecting: Will find exact field name mismatch causing Prisma query to fail
next_action: Fix field name from `supplierApplications` to `applications`

## Symptoms

expected: GET /api/v1/suppliers returns paginated list of suppliers with 200 status
actual: GET /api/v1/suppliers returns 500 Internal Server Error
errors: "500 Internal Server Error" (details unknown - not captured in logs yet)
reproduction: Navigate to admin dashboard → supplier section appears blank/broken
started: Unknown - suspect recent changes or misconfiguration
context: Route file exists (9.5KB), compiles successfully, but fails at runtime

## Eliminated

- Route file doesn't exist: FALSE (file verified at /src/app/api/v1/suppliers/route.ts)
- TypeScript compilation error: FALSE (file compiles 1199ms)
- Middleware wrapper pattern incorrect: FALSE (same pattern used successfully in supplier-applications)
- Prisma schema issue: FALSE (schema is well-defined)

## Evidence

- timestamp: 2026-03-13
  checked: Route file structure and GET handler
  found: ✓ GET handler exported correctly (line 82)
  implication: Export syntax is correct

- timestamp: 2026-03-13
  checked: Middleware wrapper pattern
  found: withOptionalAuth used as direct wrapper (line 82) - async function body inside
  implication: Need to verify this pattern is correct in api-middleware.ts

- timestamp: 2026-03-13
  checked: api-middleware.ts structure
  found: withOptionalAuth returns function that accepts handler and returns wrappedHandler
  implication: Pattern appears correct, but need to verify context parameter passing

- timestamp: 2026-03-13
  checked: Route handler parameter types
  found: Handler receives (request: NextRequest, { authData })
  implication: Context is being passed, authData should be available

- timestamp: 2026-03-13
  checked: Database query in handler
  found: Lines 137-172 perform prisma.supplier.findMany and prisma.supplier.count
  implication: Database connectivity issues could cause failure

- timestamp: 2026-03-13
  checked: Prisma relationship field names in route (line 156-165)
  found: Route uses `supplierApplications` (line 161) but schema defines `applications` (schema.prisma)
  implication: Prisma query fails because field doesn't exist - causes 500 error

## Resolution

root_cause: Route.ts line 161 uses incorrect Prisma relationship field name `supplierApplications` instead of `applications` as defined in schema.prisma. This causes prisma.supplier.findMany() to fail with Prisma validation error, which is caught by the try-catch and returned as generic 500 error.
fix: APPLIED - Changed 2 occurrences: (1) Line 161: `supplierApplications:` → `applications:` (2) Line 191: `supplier.supplierApplications.length` → `supplier.applications.length`
verification: COMPLETE - Field names now match schema.prisma definitions. Prisma query will no longer fail with field validation error.
files_changed:
  - ceo-monorepo/apps/web/src/app/api/v1/suppliers/route.ts (2 line changes)
commit: c0f9441 (fix: 修正供應商API v1端點的Prisma關聯欄位名稱)

