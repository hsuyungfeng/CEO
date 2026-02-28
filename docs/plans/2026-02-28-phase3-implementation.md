# Phase 3: UX Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove B2C complexity from CEO Platform and reduce frontend codebase by 30-40% while maintaining all core business functionality.

**Architecture:** 4-stage simplification (homepage → dashboard → product page → code cleanup), each stage builds independently with frequent testing and commits. No database changes needed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Shadcn/ui

**Estimated Duration:** 2 weeks, 1-2 engineers

---

## Phase Overview

```
Week 1:
├── Days 1-3: Homepage Simplification (Remove search & marketing)
└── Days 3-5: Dashboard Redesign (3 metrics only)

Week 2:
├── Days 5-9: Product Page Cleanup (Remove group-buy mechanics)
├── Days 9-14: Code Cleanup (Delete dead code)
└── Day 14: Testing & Buffer
```

---

## SECTION 1: HOMEPAGE SIMPLIFICATION (Days 1-3)

### Task 1: Audit current homepage structure

**Files:**
- Read: `/src/app/page.tsx`
- Read: `/src/components/home/*` (all files)
- Read: `/src/lib/hooks/useHome*` (if exists)

**Step 1: Examine current homepage code**

```bash
cd /Users/hsuyungfeng/Applesoft/Onecompany/ceo-platform/ceo-monorepo/apps/web
find src/components/home -name "*.tsx" -type f | head -20
```

Expected output: List of all homepage components (SearchBar, HeroCarousel, MarketingBanner, etc.)

**Step 2: Document what needs to be removed**

Create a checklist of:
- Search-related components (SearchBar, SearchInput, SearchFilters)
- Marketing components (HeroCarousel, PromoBanner, CountdownBanner)
- Call-to-action components (CTAOverlay, NewsletterSignup)
- Other B2C-specific sections

**Step 3: Commit the audit**

```bash
git commit -m "docs: Phase 3 - audit current homepage structure

Identified components to remove:
- Search-related: SearchBar, SearchInput, SearchFilters
- Marketing: HeroCarousel, PromoBanner, CountdownBanner
- CTAs: CTAOverlay, NewsletterSignup

No code changes yet, preparing for simplification."
```

---

### Task 2: Remove search bar from homepage

**Files:**
- Modify: `/src/app/page.tsx` (remove search import and component)
- Modify: `/src/components/home/HeroSection.tsx` (or similar)
- Delete: `/src/components/search/SearchBar.tsx` (if exists)
- Delete: `/src/components/search/*` (entire search component folder)

**Step 1: Check current search component usage**

```bash
grep -r "SearchBar\|SearchInput" src/components/home/ src/app/page.tsx
```

Expected: Shows which files import search components

**Step 2: Remove search imports from homepage**

Update `/src/app/page.tsx`:

```typescript
// REMOVE these imports:
// import SearchBar from '@/components/search/SearchBar'
// import SearchFilters from '@/components/search/SearchFilters'

// KEEP these imports:
import FeaturedProducts from '@/components/home/FeaturedProducts'
import LatestProducts from '@/components/home/LatestProducts'
```

**Step 3: Remove search JSX from homepage**

Find and remove lines like:
```typescript
<SearchBar onSearch={handleSearch} />
<SearchFilters onFilterChange={handleFilter} />
```

Keep only:
```typescript
<FeaturedProducts />
<LatestProducts />
```

**Step 4: Delete search component folder**

```bash
rm -rf src/components/search/
```

**Step 5: Verify no broken imports**

```bash
npm run build 2>&1 | grep -i "search\|not found"
```

Expected: No errors related to search components

**Step 6: Commit**

```bash
git add src/app/page.tsx src/components/home/ && \
git commit -m "feat: Phase 3.1 - remove search bar from homepage

- Delete entire src/components/search/ folder
- Remove SearchBar and SearchFilters from homepage
- Keep featured and latest products sections
- No API changes, only UI removal

Core homepage now: Logo → Featured → Latest → Footer"
```

---

### Task 3: Remove marketing banners and promotions

**Files:**
- Modify: `/src/app/page.tsx` (remove banner/carousel)
- Delete: `/src/components/home/HeroCarousel.tsx` (or similar)
- Delete: `/src/components/home/PromoBanner.tsx`
- Delete: `/src/components/home/CTAOverlay.tsx`

**Step 1: Identify marketing components**

```bash
grep -n "HeroCarousel\|PromoBanner\|Countdown\|Marketing" src/app/page.tsx
```

**Step 2: Remove marketing component imports**

In `/src/app/page.tsx`:

```typescript
// REMOVE:
// import HeroCarousel from '@/components/home/HeroCarousel'
// import PromoBanner from '@/components/home/PromoBanner'
// import CTAOverlay from '@/components/home/CTAOverlay'
```

**Step 3: Remove marketing JSX**

Remove elements like:
```typescript
<HeroCarousel slides={promotionalSlides} />
<PromoBanner text="量大價優" icon={discount} />
<CTAOverlay message="限時團購" countdown={timer} />
```

**Step 4: Delete marketing component files**

```bash
rm -f src/components/home/HeroCarousel.tsx
rm -f src/components/home/PromoBanner.tsx
rm -f src/components/home/CTAOverlay.tsx
rm -f src/components/home/NewsletterSignup.tsx
```

**Step 5: Test homepage still loads**

```bash
npm run dev
# Open http://localhost:3000
# Verify: Logo, Featured Products, Latest Products, Footer visible
# Verify: No search bar, no carousels, no countdown timers
```

Expected: Clean, simple homepage with company branding + 2 product sections

**Step 6: Commit**

```bash
git add src/app/page.tsx && \
git commit -m "feat: Phase 3.2 - remove marketing banners and promotions

- Delete HeroCarousel, PromoBanner, CTAOverlay components
- Remove countdown timers and promotional overlays
- Remove newsletter signup form
- Simplify homepage to: Branding → Featured → Latest → Footer

Homepage now minimal and B2B-focused."
```

---

### Task 4: Simplify homepage styling and layout

**Files:**
- Modify: `/src/app/page.tsx` (clean up CSS/styling)
- Modify: `/src/styles/home.css` (if exists)

**Step 1: Clean up unused CSS classes**

Search for CSS classes that were used by deleted components:

```bash
grep -r "carousel\|promo\|cta\|countdown\|hero" src/styles/ src/components/home/
```

**Step 2: Remove unused Tailwind classes**

In `/src/app/page.tsx`, simplify the layout structure:

```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header/Logo */}
      <header className="bg-white border-b">
        <nav className="max-w-7xl mx-auto px-4 py-6">
          {/* Company logo and nav */}
        </nav>
      </header>

      {/* Main Content - Simple two-section layout */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Featured Products</h2>
          <FeaturedProducts />
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Latest Products</h2>
          <LatestProducts />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t">
        {/* Company info */}
      </footer>
    </div>
  )
}
```

**Step 3: Test styling**

```bash
npm run dev
# Open http://localhost:3000
# Verify: Clean, simple layout
# Verify: No overly complex animations or styling
```

**Step 4: Commit**

```bash
git add src/app/page.tsx && \
git commit -m "feat: Phase 3.3 - simplify homepage styling

- Remove complex carousel and animation classes
- Simplify grid layout to two-column product sections
- Clean up unused Tailwind classes
- Homepage is now lightweight and maintainable"
```

---

### Task 5: Verify homepage works end-to-end

**Step 1: Run build**

```bash
npm run build 2>&1 | head -50
```

Expected: Build succeeds without errors

**Step 2: Start dev server**

```bash
npm run dev &
sleep 3
```

**Step 3: Test homepage loads**

```bash
curl -s http://localhost:3000 | grep -o "<title>.*</title>"
```

Expected: Page title returns successfully

**Step 4: Manual browser test**

- Open http://localhost:3000
- Verify: Company logo visible
- Verify: Featured products section present
- Verify: Latest products section present
- Verify: No search bar
- Verify: No countdown timers or banners
- Verify: Navigation links work

**Step 5: Commit**

```bash
git add -A && \
git commit -m "Phase 3.1: Homepage simplification complete

✅ Removed search functionality
✅ Removed marketing banners and countdown timers
✅ Removed promotional CTAs and overlays
✅ Simplified layout and styling
✅ Build succeeds, homepage loads correctly

Estimated code reduction: ~200-300 lines from homepage components
Next: Admin dashboard simplification (Task 6)"
```

---

## SECTION 2: ADMIN DASHBOARD SIMPLIFICATION (Days 3-5)

### Task 6: Audit current dashboard

**Files:**
- Read: `/src/app/admin/dashboard/page.tsx`
- Read: `/src/app/api/admin/dashboard/route.ts`
- Read: `/src/components/admin/dashboard/*`

**Step 1: List current dashboard components**

```bash
find src/components/admin/dashboard -name "*.tsx" -type f
```

Expected: List of chart, analytics, and metric components

**Step 2: Identify what to remove**

Chart components to delete:
- OrderStatusChart
- RevenueChart
- SalesChart
- TopProductsChart
- ContactMessagesWidget
- etc.

**Step 3: Commit**

```bash
git commit -m "docs: Phase 3 - audit admin dashboard components

Current dashboard has 9+ sections including:
- Order status distribution chart
- Revenue trend chart
- Top products ranking
- Contact messages widget
- Other analytics sections

Plan: Reduce to 3 simple metric cards
- Total Orders (count)
- Total Revenue (sum)
- Active Users (count)"
```

---

### Task 7: Create simplified dashboard API response

**Files:**
- Modify: `/src/app/api/admin/dashboard/route.ts`

**Step 1: Check current dashboard API**

```bash
grep -A 50 "export async function GET" src/app/api/admin/dashboard/route.ts
```

**Step 2: Simplify API response**

Replace the entire response with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get simple metrics
    const totalOrders = await prisma.order.count()
    const totalRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true }
    })
    const activeUsers = await prisma.user.count({
      where: { status: 'ACTIVE' }
    })

    return NextResponse.json({
      totalOrders,
      totalRevenue: totalRevenue._sum?.totalAmount || 0,
      activeUsers
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
```

**Step 3: Test the API**

```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "totalOrders": 245,
  "totalRevenue": 125430,
  "activeUsers": 89
}
```

**Step 4: Commit**

```bash
git add src/app/api/admin/dashboard/route.ts && \
git commit -m "refactor: Phase 3.2 - simplify dashboard API response

- Reduce response to 3 metrics only: totalOrders, totalRevenue, activeUsers
- Use simple Prisma count() and aggregate() queries
- Remove all analytics and trend data from API
- Response now lightweight and fast

API now returns: { totalOrders, totalRevenue, activeUsers }"
```

---

### Task 8: Rebuild dashboard UI with 3 metric cards

**Files:**
- Modify: `/src/app/admin/dashboard/page.tsx`

**Step 1: Create new simplified dashboard component**

Replace `/src/app/admin/dashboard/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardMetrics {
  totalOrders: number
  totalRevenue: number
  activeUsers: number
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/admin/dashboard')
        if (!response.ok) throw new Error('Failed to fetch metrics')
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>
  if (!metrics) return <div className="p-8">No data</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Three Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Orders Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Total Orders</div>
            <div className="text-4xl font-bold text-blue-600">
              {metrics.totalOrders}
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
            <div className="text-4xl font-bold text-green-600">
              ${metrics.totalRevenue.toLocaleString()}
            </div>
          </div>

          {/* Active Users Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Active Users</div>
            <div className="text-4xl font-bold text-purple-600">
              {metrics.activeUsers}
            </div>
          </div>
        </div>

        {/* Admin Navigation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Admin Sections</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/products" className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              Products
            </Link>
            <Link href="/admin/users" className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              Users
            </Link>
            <Link href="/admin/orders" className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              Orders
            </Link>
            <Link href="/admin/categories" className="p-3 bg-gray-100 rounded hover:bg-gray-200">
              Categories
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Test dashboard loads**

```bash
npm run dev
# Open http://localhost:3000/admin/dashboard
# Verify: 3 metric cards display
# Verify: Numbers populate correctly
# Verify: Admin navigation links work
```

**Step 3: Commit**

```bash
git add src/app/admin/dashboard/page.tsx && \
git commit -m "feat: Phase 3.3 - rebuild dashboard with 3 metrics

- Replace 9+ analytics sections with 3 simple metric cards
- Cards: Total Orders, Total Revenue, Active Users
- Add admin navigation menu for quick access
- Remove all chart libraries and analytics components
- Dashboard now clean, fast, and maintainable

Code reduction: ~500-700 lines from dashboard components"
```

---

### Task 9: Delete removed dashboard components

**Files:**
- Delete: `/src/components/admin/dashboard/*` (all old components)

**Step 1: List dashboard components to delete**

```bash
ls -la src/components/admin/dashboard/
```

**Step 2: Delete entire dashboard components folder**

```bash
rm -rf src/components/admin/dashboard/
```

**Step 3: Verify no broken imports**

```bash
npm run build 2>&1 | grep -i "dashboard"
```

Expected: No errors

**Step 4: Commit**

```bash
git add -A && \
git commit -m "feat: Phase 3.4 - delete old dashboard components

- Delete entire src/components/admin/dashboard/ folder
- All chart and analytics components removed
- Old dashboard code no longer needed

Next: Product page simplification"
```

---

## SECTION 3: PRODUCT PAGE SIMPLIFICATION (Days 5-9)

### Task 10: Audit product detail page

**Files:**
- Read: `/src/app/products/[id]/page.tsx`
- Read: `/src/components/products/ProductDetail.tsx`

**Step 1: Examine product page structure**

```bash
find src/components/products -name "*.tsx" -type f | head -20
```

**Step 2: Document complexity to remove**

```bash
grep -n "CountdownTimer\|ProgressBar\|PriceTable\|StarRating" \
  src/app/products/[id]/page.tsx src/components/products/*.tsx
```

**Step 3: Commit audit**

```bash
git commit -m "docs: Phase 3 - audit product detail page

Identified components to remove:
- CountdownTimer (group-buy countdown)
- ProgressBar (sales progress)
- PriceTable (complex pricing tiers)
- StarRating (product ratings)
- ReviewList (customer reviews)
- SalesCount (sold items counter)

Next: Remove these components and simplify product page"
```

---

### Task 11: Remove group-buy mechanics from product page

**Files:**
- Modify: `/src/app/products/[id]/page.tsx`
- Delete: `/src/components/products/CountdownTimer.tsx`
- Delete: `/src/components/products/ProgressBar.tsx`
- Delete: `/src/components/products/DiscountHint.tsx`

**Step 1: Remove countdown timer import and usage**

In `/src/app/products/[id]/page.tsx`:

```typescript
// REMOVE:
// import CountdownTimer from '@/components/products/CountdownTimer'

// REMOVE from JSX:
// <CountdownTimer startDate={product.startDate} endDate={product.endDate} />
```

**Step 2: Remove progress bar import and usage**

```typescript
// REMOVE:
// import ProgressBar from '@/components/products/ProgressBar'

// REMOVE from JSX:
// <ProgressBar current={product.sold} target={product.target} />
```

**Step 3: Remove discount hint**

```typescript
// REMOVE:
// import DiscountHint from '@/components/products/DiscountHint'

// REMOVE from JSX:
// <DiscountHint currentTier={tier} nextTier={nextTier} savings={savings} />
```

**Step 4: Delete component files**

```bash
rm -f src/components/products/CountdownTimer.tsx
rm -f src/components/products/ProgressBar.tsx
rm -f src/components/products/DiscountHint.tsx
```

**Step 5: Verify build**

```bash
npm run build 2>&1 | grep -i "countdown\|progress\|discount"
```

Expected: No errors

**Step 6: Commit**

```bash
git add src/app/products/[id]/page.tsx && \
git commit -m "feat: Phase 3.5 - remove group-buy mechanics

- Delete CountdownTimer, ProgressBar, DiscountHint components
- Remove group-buy deadline countdown from product page
- Remove sales progress bar and tier discount hints
- Product page now shows static info only

Group-buy functionality completely removed from UI"
```

---

### Task 12: Simplify product pricing

**Files:**
- Modify: `/src/app/products/[id]/page.tsx`
- Delete: `/src/components/products/PriceTable.tsx` (if exists)
- Modify: `/src/lib/pricing.ts` (if exists, remove complex tier logic)

**Step 1: Check current pricing implementation**

```bash
grep -n "priceTiers\|PriceTable\|tiered" src/app/products/[id]/page.tsx
```

**Step 2: Simplify to single or 2-tier pricing**

Replace complex pricing logic with:

```typescript
// In /src/app/products/[id]/page.tsx

// Get first price tier (unit price) and maybe one bulk discount
const unitPrice = product.priceTiers?.[0]?.price || 0
const bulkPrice = product.priceTiers?.[1]?.price || unitPrice

return (
  <div className="product-pricing">
    <h3 className="text-2xl font-bold">
      ${unitPrice}
      {bulkPrice < unitPrice && (
        <span className="text-sm ml-4">
          Bulk: ${bulkPrice}
        </span>
      )}
    </h3>
  </div>
)
```

**Step 3: Delete price table component**

```bash
rm -f src/components/products/PriceTable.tsx
```

**Step 4: Test product page**

```bash
npm run dev
# Open http://localhost:3000/products/[some-product-id]
# Verify: Single or 2-tier price displays
# Verify: No complex price tier table
```

**Step 5: Commit**

```bash
git add src/app/products/[id]/page.tsx && \
git commit -m "feat: Phase 3.6 - simplify product pricing

- Remove complex multi-tier pricing table
- Simplify to: unit price + optional bulk discount
- Delete PriceTable component
- Product pricing now simple and maintainable"
```

---

### Task 13: Remove ratings and reviews

**Files:**
- Modify: `/src/app/products/[id]/page.tsx`
- Delete: `/src/components/products/StarRating.tsx`
- Delete: `/src/components/products/ReviewList.tsx`
- Delete: `/src/components/products/ReviewForm.tsx`
- Delete: `/src/components/products/SalesCount.tsx`

**Step 1: Remove rating import and display**

```typescript
// REMOVE:
// import StarRating from '@/components/products/StarRating'
// <StarRating rating={product.rating} count={product.reviewCount} />
```

**Step 2: Remove reviews section**

```typescript
// REMOVE:
// import ReviewList from '@/components/products/ReviewList'
// import ReviewForm from '@/components/products/ReviewForm'
// <ReviewList reviews={product.reviews} />
// <ReviewForm productId={product.id} />
```

**Step 3: Remove sales count**

```typescript
// REMOVE:
// import SalesCount from '@/components/products/SalesCount'
// <SalesCount sold={product.sold} />
```

**Step 4: Delete component files**

```bash
rm -f src/components/products/StarRating.tsx
rm -f src/components/products/ReviewList.tsx
rm -f src/components/products/ReviewForm.tsx
rm -f src/components/products/SalesCount.tsx
```

**Step 5: Verify build**

```bash
npm run build 2>&1 | grep -i "rating\|review\|sales"
```

Expected: No errors

**Step 6: Commit**

```bash
git add src/app/products/[id]/page.tsx && \
git commit -m "feat: Phase 3.7 - remove ratings and reviews

- Delete StarRating, ReviewList, ReviewForm components
- Remove SalesCount display
- Remove product review system from UI
- Product page now B2B focused: info + price + quantity + add to cart"
```

---

### Task 14: Simplify product page layout

**Files:**
- Modify: `/src/app/products/[id]/page.tsx`

**Step 1: Simplify the page structure**

```typescript
export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id)

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div>
          <img
            src={product.image}
            alt={product.name}
            className="w-full rounded-lg"
          />
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.description}</p>

          {/* Specs */}
          <div className="bg-gray-50 p-4 rounded mb-4">
            <p><strong>Unit:</strong> {product.unit}</p>
            <p><strong>Category:</strong> {product.category.name}</p>
            <p><strong>Supplier:</strong> {product.firm?.name}</p>
            <p><strong>Specs:</strong> {product.spec}</p>
          </div>

          {/* Pricing */}
          <div className="mb-6">
            <p className="text-3xl font-bold text-green-600">
              ${product.priceTiers?.[0]?.price || 0}
            </p>
          </div>

          {/* Add to Cart */}
          <AddToCartButton
            productId={product.id}
            price={product.priceTiers?.[0]?.price || 0}
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Test product page**

```bash
npm run dev
# Open http://localhost:3000/products/[id]
# Verify: Clean layout with image on left, info on right
# Verify: No countdown, progress bar, ratings, or reviews
# Verify: Add to cart button works
```

**Step 3: Commit**

```bash
git add src/app/products/[id]/page.tsx && \
git commit -m "feat: Phase 3.8 - simplify product page layout

- Clean 2-column layout: image + product info
- Display: name, description, specs, price, quantity, add to cart
- Remove all B2C elements: group-buy, ratings, reviews, complex pricing
- Product page now simple and focused

Code reduction: ~300-400 lines from product components"
```

---

## SECTION 4: CODE CLEANUP & DEAD CODE REMOVAL (Days 9-14)

### Task 15: Delete unused component folders

**Files:**
- Delete: `/src/components/search/*` (already deleted in Task 2)
- Delete: `/src/components/admin/dashboard/*` (already deleted in Task 9)
- Delete: `/src/components/products/product-*` (unused variants)

**Step 1: Find unused product components**

```bash
find src/components/products -name "*.tsx" -type f
```

**Step 2: Check which are still imported**

```bash
grep -r "ProductDetail\|ProductCard\|ProductGrid" src/ --include="*.tsx" | grep import
```

**Step 3: Delete unused ones**

```bash
# Only keep: components that are actively imported
# Delete: ProductVariant, ProductPreview, ProductComparison, etc.
rm -f src/components/products/Product*.tsx  # (keep only essential)
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | head -50
```

**Step 5: Commit**

```bash
git commit -m "feat: Phase 3.9 - delete unused component folders

- Remove all B2C-specific product components
- Keep only: FeaturedProducts, LatestProducts, ProductDetail, AddToCart
- Code cleanup reduces component directory by ~40%"
```

---

### Task 16: Remove unused API endpoints

**Files:**
- Delete: `/src/app/api/products/search/route.ts`

**Step 1: Check if search API is used**

```bash
grep -r "/api/products/search" src/
```

Expected: No imports (since we removed the search UI)

**Step 2: Delete search API endpoint**

```bash
rm -f src/app/api/products/search/route.ts
```

**Step 3: Verify no broken references**

```bash
npm run build 2>&1 | grep -i "search"
```

Expected: No errors about /api/products/search

**Step 4: Commit**

```bash
git commit -m "feat: Phase 3.10 - remove search API endpoint

- Delete /api/products/search endpoint
- Search functionality completely removed (UI + API)
- API is now simpler with fewer endpoints to maintain"
```

---

### Task 17: Simplify pricing utilities

**Files:**
- Modify or Delete: `/src/lib/pricing.ts` (if exists with complex logic)

**Step 1: Check pricing utilities**

```bash
ls -la src/lib/pricing.* 2>/dev/null || echo "No pricing file"
```

**Step 2: If pricing file exists, check complexity**

```bash
wc -l src/lib/pricing.ts
grep -c "function\|const" src/lib/pricing.ts
```

**Step 3: Simplify or delete**

If file has complex tier calculation logic:

```typescript
// BEFORE: Complex multi-tier calculations
export function calculatePrice(quantity, tiers) {
  // 20+ lines of complex logic
}

// AFTER: Simple first-tier lookup
export function getUnitPrice(product) {
  return product.priceTiers?.[0]?.price || 0
}
```

Or delete entirely if no longer used:

```bash
rm -f src/lib/pricing.ts
```

**Step 4: Commit**

```bash
git commit -m "feat: Phase 3.11 - simplify pricing utilities

- Remove complex multi-tier price calculation functions
- Simplify to basic unit price lookup
- Pricing logic now straightforward and maintainable"
```

---

### Task 18: Final code cleanup and verification

**Step 1: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds without errors or warnings

**Step 2: Check for unused imports**

```bash
# (Optional) Install and run unused import detector
npm install --save-dev knip
npx knip --reporter json | jq '.files | keys' | head -20
```

**Step 3: Test all main flows**

```bash
npm run dev &
sleep 3

# Test 1: Homepage
curl -s http://localhost:3000 | grep -o "<title>.*</title>"

# Test 2: Product page
curl -s http://localhost:3000/products | head -20

# Test 3: Admin dashboard
curl -s http://localhost:3000/api/admin/dashboard | jq .

# Test 4: Cart operations
curl -X POST http://localhost:3000/api/cart -H "Content-Type: application/json" \
  -d '{"productId":"test","quantity":1}'
```

**Step 4: Final commit**

```bash
git add -A && \
git commit -m "Phase 3: Complete UX Simplification ✅

SUMMARY OF CHANGES:
✅ Section 1: Homepage - Removed search, marketing, carousels
✅ Section 2: Dashboard - Reduced to 3 metric cards
✅ Section 3: Product pages - Removed group-buy, ratings, complex pricing
✅ Section 4: Code cleanup - Deleted ~1000+ lines of dead code

CODE METRICS:
- Deleted components: ~20+ unused components
- Deleted lines: ~1000-1200 lines of code
- Deleted files: 25+ component/utility files
- Code reduction: 35-40% frontend codebase

VERIFICATION:
✅ Build succeeds without errors
✅ Homepage loads and displays products
✅ Admin dashboard shows 3 metrics
✅ Product pages simple and functional
✅ No broken links or console errors
✅ Core business flows intact

READY FOR: Phase 4 (Payment System Enhancement)"
```

---

## EXECUTION CHECKLIST

Use this checklist while executing the plan:

- [ ] Task 1: Audit homepage
- [ ] Task 2: Remove search bar
- [ ] Task 3: Remove marketing banners
- [ ] Task 4: Simplify styling
- [ ] Task 5: Verify homepage end-to-end
- [ ] Task 6: Audit dashboard
- [ ] Task 7: Simplify API response
- [ ] Task 8: Rebuild dashboard UI
- [ ] Task 9: Delete old components
- [ ] Task 10: Audit product page
- [ ] Task 11: Remove group-buy mechanics
- [ ] Task 12: Simplify pricing
- [ ] Task 13: Remove ratings/reviews
- [ ] Task 14: Simplify layout
- [ ] Task 15: Delete unused components
- [ ] Task 16: Remove search API
- [ ] Task 17: Simplify pricing utils
- [ ] Task 18: Final cleanup & verification

---

## Testing Strategy

**During Implementation** (Tasks 1-18):
- Test after each section (homepage → dashboard → product → cleanup)
- Manual browser testing
- Build verification
- No broken imports

**End-to-End Smoke Test** (Task 18):
- Homepage loads ✅
- Can browse products ✅
- Can view product details ✅
- Can add to cart ✅
- Admin dashboard accessible ✅

**Phase 5** (Separate):
- Comprehensive test suite for all 41 API routes
- Performance testing
- Security audit

---

## Rollback Strategy

If major issues occur:

```bash
# View previous state
git log --oneline | head -20

# Revert specific commits
git revert COMMIT_HASH

# Or hard reset to previous point (⚠️ destructive)
git reset --hard COMMIT_HASH
```

Each task is a separate commit, so rolling back is easy.

---

## Success Criteria

✅ All build succeeds without errors
✅ Homepage simplified (no search, marketing)
✅ Dashboard reduced to 3 metrics
✅ Product pages simplified (no group-buy, ratings)
✅ Code reduced by 30-40%
✅ Core business flows work
✅ No console errors
✅ All commits organized and documented

---

**Plan Status**: ✅ READY FOR EXECUTION

