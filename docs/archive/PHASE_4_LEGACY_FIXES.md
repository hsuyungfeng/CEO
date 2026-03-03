# Phase 4 - Legacy Code Fixes Plan

**Status:** Planning & Implementation
**Timeline:** 3-4 days
**Risk Level:** Low (fixes only, no new features)

---

## Overview

Before deploying Phase 4 to production, we'll fix pre-existing build and TypeScript errors to ensure a clean, stable codebase.

**Current Build Errors:**
1. ❌ `useSearchParams()` missing Suspense boundary in `/reset-password`
2. ❌ TypeScript type errors in `pocketbase-auth.ts` (type casting)
3. ❌ Missing type declarations (@types/jsonwebtoken)
4. ❌ Missing module types (ioredis)
5. ❌ Sentry configuration type errors

**Phase 4 Status:** ✅ Unaffected (all Phase 4 code is clean)

---

## Fix Plan (3-4 Days)

### Day 1: Quick Wins (2-3 hours)

#### Fix 1: Install Missing Type Declarations
**Issue:** Missing `@types/jsonwebtoken`
**Location:** `src/lib/jwt-manager.ts:1`
**Fix:**
```bash
npm install --save-dev @types/jsonwebtoken @types/ioredis
```

#### Fix 2: Fix useSearchParams Suspense Boundary
**Issue:** `/reset-password` page uses `useSearchParams()` without Suspense
**Location:** `src/app/(auth)/reset-password/page.tsx`
**Fix:**
```tsx
import { Suspense } from 'react'

// Wrap component that uses useSearchParams
function ResetPasswordContent() {
  const searchParams = useSearchParams()
  // ... component logic
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
```

**Time:** ~15 minutes

---

### Day 1-2: Type Fixes (2-3 hours)

#### Fix 3: PocketBase Type Casting
**Issue:** Type casting from `RecordModel` to `PBUser` without type safety
**Location:** `src/lib/pocketbase-auth.ts` (multiple locations)
**Fix:**
```tsx
// Change from:
const user = record as PBUser

// To:
const user = record as unknown as PBUser
```

**Affected Lines:** 79, 99, 117, 166, 359, 383, etc.

**Time:** ~30 minutes (find & replace)

#### Fix 4: Type Safety in prisma-auth.ts
**Issue:** `role` type mismatch (string vs UserRole enum)
**Location:** `src/lib/prisma-auth.ts:143`
**Fix:**
```tsx
// Ensure role matches UserRole enum values
const role = (user.role || 'EMPLOYEE') as UserRole

const createData = {
  password: hashedPassword,
  name: user.name || '',
  email: user.email,
  taxId: user.taxId || null,
  phone: user.phone || null,
  address: user.address || null,
  contactPerson: user.contactPerson || null,
  points: user.points || 0,
  role: role,  // Use enum value, not string
  emailVerified: user.emailVerified || false,
  status: user.status || 'ACTIVE',
  firmName: user.firmName || null,
}
```

**Time:** ~20 minutes

#### Fix 5: Sentry Configuration Types
**Issue:** Missing `Replay` property on Sentry type
**Location:** `src/lib/sentry.client.config.ts:65`
**Fix:**
```tsx
// Check Sentry version compatibility
// If using @sentry/nextjs v7, use ReplaySessionSampleRate instead
const sentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    new Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Or for v8+:
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
}
```

**Time:** ~20 minutes (may need version check)

---

### Day 2: Build Verification (1-2 hours)

#### Step 1: Run TypeScript Check
```bash
npm run typecheck 2>&1 | grep -c "error TS"
# Should show 0 errors after fixes
```

#### Step 2: Run Build
```bash
npm run build
# Should complete without errors
```

#### Step 3: Verify Phase 4 Endpoints
```bash
npm run dev &
curl http://localhost:3000/api/invoices
# Should return valid response
```

**Time:** ~1 hour

---

### Day 3: Testing & Validation (2-3 hours)

#### Test Suite
```bash
# Run any existing tests
npm run test:watch

# Manual testing using Phase 4 guide
curl -X GET http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN"
```

#### Build Artifacts
```bash
npm run build
# Verify .next/ folder created
# Verify no build warnings about Phase 4 code
```

**Time:** ~1.5 hours

---

### Day 3-4: Final Validation (1 hour)

#### Full Verification
```bash
# 1. TypeScript check - 0 errors
npm run typecheck

# 2. Build - clean completion
npm run build

# 3. Dev server - starts cleanly
npm run dev

# 4. Phase 4 endpoints - all working
# Use PHASE_4_API_TESTING_GUIDE.md
```

**Time:** ~1 hour

---

## Implementation Order

### Priority 1 (High Impact, Quick Fixes)
- [ ] Install missing type declarations
- [ ] Fix useSearchParams Suspense boundary
- [ ] Fix PocketBase type casting

### Priority 2 (Medium Impact)
- [ ] Fix prisma-auth.ts type mismatch
- [ ] Fix Sentry configuration types

### Priority 3 (Validation)
- [ ] Run full TypeScript check
- [ ] Run full build
- [ ] Test Phase 4 endpoints

---

## Testing Checklist

### Unit Test Level
- [ ] TypeScript compilation: 0 errors
- [ ] ESLint: 0 Phase 4-related issues
- [ ] Build: successful with no warnings

### Integration Level
- [ ] Dev server starts cleanly
- [ ] All Phase 4 endpoints accessible
- [ ] No 500 errors in console

### Deployment Level
- [ ] Production build succeeds
- [ ] No runtime errors in Phase 4 code
- [ ] All API responses valid

---

## Rollback Plan

If any fix causes issues:
1. `git revert [commit-hash]` to undo the fix
2. Investigate the issue
3. Implement alternative fix
4. Re-test

---

## Estimated Timeline

| Phase | Task | Time | Day |
|-------|------|------|-----|
| 1 | Install dependencies | 5 min | Day 1 |
| 2 | Fix Suspense boundary | 15 min | Day 1 |
| 3 | Fix type casting | 30 min | Day 1-2 |
| 4 | Fix type mismatches | 20 min | Day 2 |
| 5 | Fix Sentry config | 20 min | Day 2 |
| 6 | TypeScript check | 30 min | Day 2 |
| 7 | Build verification | 1 hour | Day 2-3 |
| 8 | Testing | 1.5 hours | Day 3 |
| 9 | Final validation | 1 hour | Day 3-4 |
| **Total** | | **~5-6 hours** | **3-4 days** |

---

## Success Criteria

✅ All criteria must pass before Phase 4 deployment:

- [ ] `npm run typecheck` returns 0 errors
- [ ] `npm run build` succeeds without warnings
- [ ] `npm run dev` starts without errors
- [ ] All Phase 4 API endpoints working
- [ ] No Phase 4 code has any warnings
- [ ] Git history clean and committs documented
- [ ] Phase 4 functionality completely unaffected

---

## Post-Fix Deployment

Once all fixes pass:

### Staging Deployment (1 day)
1. Deploy to staging environment
2. Run Phase 4 API testing guide (45 minutes)
3. User acceptance testing
4. Verify performance baselines

### Production Deployment (2 hours)
1. Deploy to production
2. Monitor error logs
3. Verify all endpoints working
4. Communicate launch to users

---

## Notes

**Why Fix Legacy Code First?**
- ✅ Cleaner codebase for production
- ✅ Prevents unrelated errors from masking Phase 4 issues
- ✅ Easier debugging if problems arise
- ✅ Better foundation for Phase 5 work
- ✅ Professional code quality

**Phase 4 Unaffected:**
- ✅ No Phase 4 code needs changes
- ✅ All Phase 4 code is type-safe
- ✅ All Phase 4 tests still pass
- ✅ Can deploy Phase 4 immediately after legacy fixes

---

## Next Steps

1. ✅ Review this plan
2. ⏭️ **Run Day 1 fixes** (1-2 hours)
3. ⏭️ **Run Day 2 fixes & verification** (2-3 hours)
4. ⏭️ **Run Day 3 testing & validation** (2-3 hours)
5. ⏭️ **Deploy Phase 4 to staging** (1 day)
6. ⏭️ **Deploy Phase 4 to production** (2 hours)

---

**Estimated Total Time to Production:** 4-5 days (including testing & validation)

Ready to start implementing? I can help with any of the fixes! 🚀
