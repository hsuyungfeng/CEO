---
phase: 16
name: 3D Frontend Integration
slug: 3d-frontend-integration
objective: |
  Integrate 3D model viewer into product detail pages with interactive controls, material preview, and AR integration for mobile.

  Deliverables:
  - Model3DViewer React component (Three.js)
  - Product detail page 3D section
  - PBR material rendering
  - Interactive controls (rotate, zoom, light)
  - Mobile AR preview (iOS)
  - Generation progress UI
duration: 1-2 weeks
status: pending
created: 2026-03-25
requirements: []
---

# Phase 16: 3D Frontend Integration & UI/UX

## Overview

Build user-facing 3D visualization features. Members can see furniture models interactively, suppliers see generation progress, AR preview available on mobile.

## Tasks

### Task 16.1: Model3DViewer Component
**Objective:** Create reusable React component for 3D model display using Three.js

**Files to create/modify:**
- `ceo-monorepo/apps/web/src/components/3d/Model3DViewer.tsx` (new)
- `ceo-monorepo/apps/web/src/lib/3d/material-renderer.ts` (new)

**Implementation:**
1. Create Three.js scene setup
2. Load GLB model with PBR materials
3. Add interactive controls (OrbitControls)
4. Implement material preview UI
5. Add performance optimization (LOD levels)
6. Error boundary for model loading failures

**Success criteria:**
- [ ] Component renders 3D model correctly
- [ ] Can rotate/zoom interactively
- [ ] PBR materials display properly
- [ ] Handles model loading errors gracefully

---

### Task 16.2: Product Detail Page Integration
**Objective:** Add 3D viewer to product detail pages

**Files to create/modify:**
- `ceo-monorepo/apps/web/src/app/(auth)/products/[id]/page.tsx` (modify)
- `ceo-monorepo/apps/web/src/components/products/ProductDetail3DSection.tsx` (new)

**Implementation:**
1. Add 3D section to product detail layout
2. Show Model3DViewer when 3D model available
3. Show generation status if pending
4. Add "Generate 3D" button for suppliers
5. Display generation progress (queue position, ETA)

**Success criteria:**
- [ ] 3D section displays on product detail
- [ ] Shows model when available
- [ ] Shows status during generation
- [ ] Suppliers can trigger generation

---

### Task 16.3: AR Preview (Mobile)
**Objective:** Add USDZ preview for iOS AR

**Files to create/modify:**
- `ceo-monorepo/apps/web/src/components/3d/ARPreview.tsx` (new)

**Implementation:**
1. Detect iOS device
2. Provide AR link (uses USDZ model)
3. Quick Look integration
4. Fallback for non-AR devices

**Success criteria:**
- [ ] AR link works on iOS
- [ ] Quick Look opens USDZ model
- [ ] Graceful fallback on Android/non-AR

---

### Task 16.4: Generation Progress UI
**Objective:** Real-time generation progress display

**Files to create/modify:**
- `ceo-monorepo/apps/web/src/components/3d/GenerationProgress.tsx` (new)
- `ceo-monorepo/apps/web/src/hooks/use3DGenerationStatus.ts` (new)

**Implementation:**
1. Poll `/api/products/[id]/3d-model` for status
2. Show progress bar during generation
3. Update in real-time
4. Show error messages on failure
5. Provide retry button

**Success criteria:**
- [ ] Status updates in real-time
- [ ] UI shows generation progress
- [ ] Error messages helpful
- [ ] Retry works on failure

---

### Task 16.5: E2E Tests for UI
**Objective:** Test 3D viewer and generation UI

**Files to create/modify:**
- `ceo-monorepo/apps/web/tests/e2e/3d-frontend.spec.ts` (new)

**Implementation:**
1. Test: Member can view 3D model on product detail
2. Test: Generation progress UI updates
3. Test: Supplier can trigger generation from UI
4. Test: AR preview link opens on iOS

**Success criteria:**
- [ ] 4+ test cases pass
- [ ] Coverage > 80% for new components
- [ ] Tests clean up after run

---

## Dependencies

- Phase 15 (API & queue system) REQUIRED

---

## Success Criteria

- [ ] Model3DViewer displays 3D furniture with interactive controls
- [ ] Product detail pages show 3D section
- [ ] PBR materials render correctly
- [ ] Generation progress visible to users
- [ ] AR preview works on iOS
- [ ] E2E tests pass
