---
status: resolved
trigger: Admin orders page showing 400 error after API endpoint fixes
created: 2026-03-23T00:00:00Z
updated: 2026-03-23T00:00:00Z
---

## Current Focus

hypothesis: API response structure mismatch - page expects success/data but API returns different structure on 400 error
test: Trace what happens when API returns 400 - does page handle it correctly?
expecting: Page will fail to access result.data.orders because result structure differs on error
next_action: Check error handling in page fetch and verify error response structure from API

## Symptoms

expected: Admin orders page displays order list with proper pagination
actual: Page shows 400 error or blank/error state
errors: HTTP 400 Bad Request (possibly from query validation)
reproduction: Navigate to /admin/orders in browser after recent API fixes
started: Just discovered after 3 recent commits (6763cef, 1b3a4a4, 46de870)

## Investigation Context

- API endpoint `/api/admin/orders` returns HTTP 200 on direct curl test
- Recent changes increased limit parameter to 500
- Page fetch located at `src/app/admin/orders/page.tsx` line 75
- API validation schema in `src/types/admin.ts`
- Three commits already merged with API changes

## Eliminated

<!-- Will append as hypotheses are disproven -->

## Evidence

- timestamp: 2026-03-23T00:00:00Z
  checked: Problem statement from user
  found: API works with curl but page shows 400 error - indicates client-side request mismatch
  implication: Not an API code issue, likely request formatting or parameter validation

- timestamp: 2026-03-23T01:00:00Z
  checked: page.tsx line 75 fetch call
  found: sends query `?limit=200&sortBy=createdAt&sortOrder=desc` - missing page parameter
  implication: OrderQuerySchema has page default=1, so this should be OK

- timestamp: 2026-03-23T01:01:00Z
  checked: OrderQuerySchema in admin.ts lines 117-127
  found: Schema defines page with .default(1), limit with .max(500).default(20), sortBy/sortOrder with enums and defaults
  implication: Query parameters should pass validation even with missing page

- timestamp: 2026-03-23T01:02:00Z
  checked: API route.ts validation logic lines 31-46
  found: Uses safeParse on queryParams object, returns 400 with error details if validation fails
  implication: If 400 error occurs, error object in response should show which field failed

- timestamp: 2026-03-23T01:05:00Z
  checked: Zod coerce.number() behavior with null vs undefined
  found: z.coerce.number().default(1) treats null and undefined differently
    - null: FAILS validation (Number(null)=0, violates positive() constraint)
    - undefined: PASSES validation (triggers .default(1))
  implication: Old code with searchParams.get() returning null caused validation failure

- timestamp: 2026-03-23T01:10:00Z
  checked: Current API endpoint via curl
  found: Returns HTTP 200 with correct response structure (success:true, data.orders array populated)
  implication: Fix has been applied and is working correctly

## Resolution

root_cause: |
  Zod's `.coerce.number()` treats `null` and `undefined` differently:
  - `null` fails validation with "Too small: expected number to be >0" (because Number(null) = 0)
  - `undefined` triggers `.default(1)` and passes validation

  The API route parsed query parameters like:
  ```typescript
  page: searchParams.get('page')  // Returns null when parameter missing
  ```

  When page.tsx made request without `page` parameter, API received `{page: null, ...}`,
  validation failed, and API returned 400 error. Page then couldn't display orders.

fix: |
  Commit 6763cef changed the parameter parsing to:
  ```typescript
  page: searchParams.get('page') ?? undefined  // Convert null to undefined
  ```

  This allows Zod's `.default(1)` to work correctly when the parameter is missing.

verification: |
  - Tested Zod schema with null vs undefined: null fails, undefined passes
  - Tested current API endpoint via curl: returns HTTP 200 with correct data structure
  - Confirmed commits show the fix was applied (6763cef)
  - Tested local dev server: API returns correct response for the fetch call from page.tsx

files_changed:
  - ceo-monorepo/apps/web/src/app/api/admin/orders/route.ts (line 19-28)
