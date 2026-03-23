# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## admin-orders-page-400-error — Zod coerce.number() validation fails on null query parameter

- **Date:** 2026-03-23
- **Error patterns:** 400 Bad Request, query parameter validation, null coercion, admin orders API
- **Root cause:** Zod's `.coerce.number()` treats `null` and `undefined` differently. When `searchParams.get('page')` returns `null` (parameter missing), Zod coerces it to 0, which fails `.positive()` validation. Using `?? undefined` instead allows `.default(1)` to trigger.
- **Fix:** Changed `searchParams.get('page')` to `searchParams.get('page') ?? undefined` in API route handler to properly handle missing query parameters
- **Files changed:** ceo-monorepo/apps/web/src/app/api/admin/orders/route.ts
---

