---
phase: 15-3d-integration-foundation
plan: 15
subsystem: api
tags: [trellis, 3d-generation, bull-queue, redis, prisma, python, flask, playwright]

# Dependency graph
requires:
  - phase: 14-production-deployment
    provides: Production infrastructure + PostgreSQL + Redis already running

provides:
  - Python TRELLIS.2 microservice (Flask, port 5001) with health check and generate endpoints
  - Prisma schema: Product3DModel, GenerationQueue, GenerationLog models + enums
  - Bull Queue infrastructure (3d:generation queue) with retry logic and event handlers
  - API routes: POST /api/products/[id]/generate-3d and GET /api/products/[id]/3d-model
  - E2E test suite for 3D generation workflow (11 test cases)

affects:
  - 16-3d-frontend-integration
  - 17-3d-production-deployment

# Tech tracking
tech-stack:
  added:
    - Flask (Python microservice for TRELLIS.2)
    - flask-cors (CORS support for Python service)
    - Pillow (image processing in Python)
    - Bull Queue (already in dependencies, now actively used)
    - ioredis (already in dependencies, queue Redis client)
  patterns:
    - Microservice pattern: Python ML service + Node.js Next.js API separation
    - Bull Queue with exponential backoff retry (3 attempts, 5s base delay)
    - Audit logging on 3D generation requests via auditLogger.log()
    - Auth check via SupplierProduct -> Supplier -> UserSupplier chain

key-files:
  created:
    - ceo-monorepo/apps/3d-generation-service/app.py
    - ceo-monorepo/apps/3d-generation-service/requirements.txt
    - ceo-monorepo/apps/3d-generation-service/test_local.py
    - ceo-monorepo/apps/3d-generation-service/README.md
    - ceo-monorepo/apps/web/src/lib/queues/3d-generation.queue.ts
    - ceo-monorepo/apps/web/src/lib/queues/3d-generation.worker.ts
    - ceo-monorepo/apps/web/src/lib/services/3d-generation.service.ts
    - ceo-monorepo/apps/web/src/app/api/products/[id]/generate-3d/route.ts
    - ceo-monorepo/apps/web/src/app/api/products/[id]/3d-model/route.ts
    - ceo-monorepo/apps/web/tests/e2e/3d-generation.spec.ts
  modified:
    - ceo-monorepo/apps/web/prisma/schema.prisma (added 3 models + 2 enums)

key-decisions:
  - "Microservice architecture: Python TRELLIS.2 Flask service on port 5001, not embedded in Node.js"
  - "Bull Queue with Redis for async job processing, max 2 concurrent GPU jobs"
  - "Store both GLB (web) and USDZ (iOS AR) model formats in database"
  - "Auth check via SupplierProduct -> Supplier -> UserSupplier relation chain (not Firm)"
  - "auditLogger.log() signature: { action, actor, target, details } not { userId, action, resourceType }"

patterns-established:
  - "3D generation audit: use PRODUCT_UPDATE action with operation: GENERATE_3D_MODEL in details"
  - "Bull Queue job ID = GenerationQueue DB record ID for correlated tracking"
  - "TRELLIS.2 service runs in framework mode without model until 9GB download complete"

requirements-completed: []

# Metrics
duration: 45min
completed: 2026-03-25
---

# Phase 15: 3D Integration Foundation Summary

**TRELLIS.2 3D generation infrastructure with Python Flask microservice, Prisma schema (Product3DModel + GenerationQueue + GenerationLog), Bull Queue async processor, and dual API endpoints (POST generate + GET status)**

## Performance

- **Duration:** 45 min
- **Started:** 2026-03-25T10:10:08Z
- **Completed:** 2026-03-25T10:55:00Z
- **Tasks:** 5 (Tasks 15.1-15.3 were committed in previous session; 15.4-15.5 committed in this session)
- **Files modified:** 11

## Accomplishments

- Python TRELLIS.2 Flask microservice with health check (`/health`), generation (`/generate`), status (`/status/<job_id>`), and info (`/info`) endpoints
- Prisma schema extended with 3 new models (`Product3DModel`, `GenerationQueue`, `GenerationLog`) and 2 enums (`Product3DModelStatus`, `GenerationQueueStatus`) — Product model has proper relations
- Bull Queue infrastructure with Redis, exponential backoff retry (3x), and 4 event handlers (active/progress/completed/failed) that sync DB state
- REST API: POST `/api/products/[id]/generate-3d` (supplier auth + Zod validation + audit log) and GET `/api/products/[id]/3d-model` (progress tracking + URLs)
- 11 E2E test cases covering auth, Zod validation, CORS, and lifecycle workflow

## Task Commits

Each task was committed atomically:

1. **Task 15.1: Environment Setup & TRELLIS.2 Service** - `9f5a911` (feat)
2. **Task 15.2: Prisma Schema Extensions** - `a85229a` (feat)
3. **Task 15.3: Bull Queue Integration** - `de15c45` (feat)
4. **Task 15.4: API Route Handlers** - `f7a35da` (feat)
5. **Task 15.5: Integration Tests** - `86c0437` (test)

**Plan metadata:** See final docs commit

## Files Created/Modified

- `ceo-monorepo/apps/3d-generation-service/app.py` - Flask microservice with TRELLIS.2 wrapper
- `ceo-monorepo/apps/3d-generation-service/requirements.txt` - Python dependencies
- `ceo-monorepo/apps/web/prisma/schema.prisma` - Added Product3DModel, GenerationQueue, GenerationLog + enums
- `ceo-monorepo/apps/web/src/lib/queues/3d-generation.queue.ts` - Bull Queue with event handlers and public API
- `ceo-monorepo/apps/web/src/lib/queues/3d-generation.worker.ts` - Queue worker processor
- `ceo-monorepo/apps/web/src/lib/services/3d-generation.service.ts` - TRELLIS.2 HTTP client service
- `ceo-monorepo/apps/web/src/app/api/products/[id]/generate-3d/route.ts` - POST endpoint
- `ceo-monorepo/apps/web/src/app/api/products/[id]/3d-model/route.ts` - GET endpoint
- `ceo-monorepo/apps/web/tests/e2e/3d-generation.spec.ts` - 11 E2E test cases

## Decisions Made

- **Microservice pattern:** Python Flask on port 5001 handles ML inference, Node.js handles business logic and queue management
- **Queue correlated tracking:** Bull job ID = GenerationQueue DB record ID for unified tracking
- **Auth check pattern:** Use `SupplierProduct -> Supplier -> UserSupplier` chain (not Firm model which doesn't have supplierUsers)
- **Framework mode:** TRELLIS.2 service runs without actual model until 9GB download complete — serves as scaffolding

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed auditLogger.log() API call signature**
- **Found during:** Task 15.4 (API Route Handlers)
- **Issue:** generate-3d/route.ts called `auditLogger.log({ userId, action, resourceType, resourceId, details })` but the actual API is `{ action, actor, target?, details? }`
- **Fix:** Updated calls to use correct signature: `auditLogger.log({ action: 'PRODUCT_UPDATE', actor: session.user.id, target: productId, details: {...} })`
- **Files modified:** `src/app/api/products/[id]/generate-3d/route.ts`
- **Verification:** TypeScript types align with AuditLogger class definition
- **Committed in:** f7a35da (Task 15.4 commit)

**2. [Rule 1 - Bug] Removed invalid fetch() timeout option**
- **Found during:** Task 15.4 (API Route Handlers)
- **Issue:** Code used `fetch(url, { method: 'HEAD', timeout: 5000 })` — `timeout` is not a valid Fetch API option in browsers/Node.js
- **Fix:** Removed the image accessibility pre-check (it was fragile — image URLs may block HEAD requests). The queue will naturally fail if image is unreachable.
- **Files modified:** `src/app/api/products/[id]/generate-3d/route.ts`
- **Verification:** No TypeScript errors
- **Committed in:** f7a35da (Task 15.4 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- TRELLIS.2 model (9GB) not downloaded — service runs in framework mode. Need GPU + HuggingFace CLI to download actual model for production use.
- Tests are API-level (no actual 3D generation tested) because TRELLIS.2 requires GPU hardware + 9GB model download

## User Setup Required

To enable actual 3D generation (not just API scaffolding):

1. Install Python dependencies: `cd ceo-monorepo/apps/3d-generation-service && pip install -r requirements.txt`
2. Download TRELLIS.2 model (9GB, requires GPU): `huggingface-cli download VAST-AI-Research/TRELLIS-v1.3.1 --local-dir ./models`
3. Start Python service: `python app.py`
4. Add to `.env.local`: `TRELLIS_SERVICE_URL=http://localhost:5001`

Without these steps, the API routes will still work but jobs will fail in the queue processor.

## Next Phase Readiness

- Phase 16 (3D Frontend Integration) can proceed: API endpoints are stable and documented
- Bull Queue infrastructure ready for frontend status polling
- Schema migrations needed: run `pnpm db:push` or `pnpm db:migrate` before first use
- Redis must be running for Bull Queue to function

---
*Phase: 15-3d-integration-foundation*
*Completed: 2026-03-25*
