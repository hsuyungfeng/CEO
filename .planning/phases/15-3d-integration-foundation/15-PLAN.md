---
phase: 15
name: 3D Integration Foundation
slug: 3d-integration-foundation
objective: |
  Establish TRELLIS.2 3D generation service foundation with API integration, Prisma schema extensions, and asynchronous queue system.

  Deliverables:
  - Python TRELLIS.2 service running locally
  - Extended Prisma schema (Product3DModel, 3DGenerationQueue tables)
  - Bull Queue integration with Redis
  - API route handlers for model generation requests
  - Test fixtures for 3D model generation workflow
duration: 1-2 weeks
status: pending
created: 2026-03-25
requirements: []
---

# Phase 15: 3D Integration Foundation

## Overview

This phase establishes the backend infrastructure for 3D furniture model generation using TRELLIS.2. Focus is on service layer setup, data model extensions, and queue system integration.

## Tasks

### Task 15.1: Environment Setup & TRELLIS.2 Service
**Objective:** Set up Python environment and get TRELLIS.2 model running locally

**Files to create/modify:**
- `ceo-monorepo/apps/3d-generation-service/` (new microservice directory)
- `ceo-monorepo/apps/3d-generation-service/app.py`
- `ceo-monorepo/apps/3d-generation-service/requirements.txt`
- `.env.local` (add TRELLIS_MODEL_PATH, PYTHON_ENV_PATH)

**Implementation:**
1. Create Python microservice directory structure
2. Set up virtual environment with TRELLIS.2 dependencies
3. Download TRELLIS v1.3.1 model (9GB) from HuggingFace
4. Create Flask/FastAPI endpoint for model generation
5. Implement health check endpoint
6. Add local testing script to verify generation works

**Success criteria:**
- [ ] Python venv created with all dependencies
- [ ] Model downloads successfully to disk
- [ ] HTTP endpoint responds to health checks
- [ ] Can generate a test 3D model from sample image in < 5 seconds (512³)

---

### Task 15.2: Prisma Schema Extensions
**Objective:** Extend Prisma schema to support 3D model tracking and generation queue

**Files to create/modify:**
- `ceo-monorepo/apps/web/prisma/schema.prisma` (add 3 new models)

**Implementation:**
1. Add `Product3DModel` model:
   - productId (FK to Product)
   - sourceImageUrl
   - status (PENDING | GENERATING | COMPLETED | FAILED)
   - modelUrlGLB, modelUrlUSDZ
   - pbrMetadata (texture info)
   - generatedAt, expiresAt

2. Add `GenerationQueue` model:
   - queueId (PK)
   - productId (FK)
   - status (QUEUED | PROCESSING | COMPLETE | ERROR)
   - priority (1-10)
   - retriesCount, maxRetries
   - errorMessage
   - createdAt, startedAt, completedAt

3. Add `GenerationLog` model (audit):
   - logId, productId, status change, timestamp, metadata

4. Update Product model:
   - Add relation to Product3DModel

**Success criteria:**
- [ ] Schema compiles without errors
- [ ] Relations are properly defined
- [ ] Can run `pnpm db:generate` successfully
- [ ] Prisma Client includes new models

---

### Task 15.3: Bull Queue Integration
**Objective:** Set up Bull Queue for asynchronous 3D generation tasks

**Files to create/modify:**
- `ceo-monorepo/apps/web/src/lib/queues/3d-generation.queue.ts` (new)
- `ceo-monorepo/apps/web/src/lib/services/3d-generation.service.ts` (new)

**Implementation:**
1. Create Bull Queue with Redis connection (reuse existing Redis)
2. Define queue name: `3d:generation`
3. Implement queue producer:
   - `enqueue3DGeneration(productId, imageUrl, priority)`
   - Validates input, creates DB record, adds to queue
4. Implement queue worker/processor:
   - Listens for jobs
   - Calls Python TRELLIS.2 service
   - Updates DB on completion/failure
   - Handles retries (max 3)
5. Add event listeners:
   - `completed`: Save model URLs to DB
   - `failed`: Log error, mark as FAILED
   - `progress`: Update job progress

**Success criteria:**
- [ ] Queue connects to Redis successfully
- [ ] Can enqueue a job and it appears in queue
- [ ] Worker processes jobs and updates DB
- [ ] Retries work on transient failures
- [ ] Job completion updates Product3DModel record

---

### Task 15.4: API Route Handlers
**Objective:** Create API endpoints for triggering and monitoring 3D generation

**Files to create/modify:**
- `ceo-monorepo/apps/web/src/app/api/products/[id]/generate-3d/route.ts` (new)
- `ceo-monorepo/apps/web/src/app/api/products/[id]/3d-model/route.ts` (new - GET)

**Implementation:**
1. POST `/api/products/[id]/generate-3d`
   - Auth: supplier must own product
   - Input: validation with Zod
   - Enqueues generation job
   - Returns jobId + status
   - Audit log: who requested generation

2. GET `/api/products/[id]/3d-model`
   - Returns current 3D model status + URLs
   - If generating: returns progress %
   - Auth: anyone can view if product is visible

3. Include CSRF protection on POST endpoint

**Success criteria:**
- [ ] POST endpoint enqueues jobs
- [ ] GET endpoint returns status correctly
- [ ] Auth checks work
- [ ] Zod validation catches bad inputs
- [ ] Response schemas are documented (OpenAPI comment)

---

### Task 15.5: Integration Tests
**Objective:** Write E2E tests for 3D generation workflow

**Files to create/modify:**
- `ceo-monorepo/apps/web/tests/e2e/3d-generation.spec.ts` (new)

**Implementation:**
1. Test: Supplier can request 3D generation
   - Login as supplier
   - Upload product
   - Call generate-3d endpoint
   - Verify job queued

2. Test: Queue processor updates status
   - Manually trigger queue processor
   - Mock TRELLIS.2 response
   - Verify DB updates

3. Test: Get 3D model status
   - During generation: returns GENERATING + progress
   - After generation: returns COMPLETED + URLs

**Success criteria:**
- [ ] 3+ test cases pass
- [ ] Tests clean up DB after run
- [ ] Tests use test fixtures (auth, products)
- [ ] Coverage > 80% for new endpoints

---

## Architecture Decisions

1. **Microservice vs Monolith:** Separate Python service (microservice) instead of calling TRELLIS.2 from Node.js. Reason: Python has mature ML ecosystem, isolation of concerns, easier GPU scaling.

2. **Queue System:** Bull Queue with Redis (existing infrastructure). Reason: Async processing, job persistence, retry logic built-in, integrates with Node.js seamlessly.

3. **Model Format:** Store both GLB (web) and USDZ (iOS AR) versions. Reason: Maximum compatibility, web uses GLB, native apps use USDZ.

4. **Database Records:** Track generation state in DB (not just in queue). Reason: Audit trail, can query historical 3D models, supports rollback.

---

## Dependencies

- Phase 14 (Production Deployment) ✅ COMPLETE
- No new npm dependencies needed (Bull, Redis clients already in codebase)
- Python environment isolation (separate from Node.js)

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| TRELLIS.2 model download fails | Setup blocked | Pre-download to server, use mirror URL |
| GPU memory insufficient locally | Service crashes | Start with 512³ resolution, use quantization |
| Redis connection fails | Queue blocks | Add connection retry logic, fallback to polling |
| Model generation timeout | User waits indefinitely | Implement 5-min timeout, automatic retry |

---

## Success Criteria

- [ ] TRELLIS.2 service responds to generation requests
- [ ] Prisma schema extends without migration errors
- [ ] Bull Queue integrates and processes jobs
- [ ] API endpoints return correct responses
- [ ] E2E tests pass (3+ cases)
- [ ] All code committed with descriptive messages
- [ ] SUMMARY.md created documenting approach
