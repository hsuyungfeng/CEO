'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Search, X, CheckCircle, Package, ExternalLink, ShoppingCart, Sparkles } from 'lucide-react';

// ==================== 型別定義 ====================

interface Supplier {
  id: string;
  companyName: string;
  industry: string | null;
  avgRating: number | null;
  isVerified: boolean;
  status: string;
}

interface Product {
  id: string;
  name: string;
  supplierId: string;
  supplier: {
    companyName: string;
  };
  priceTiers: Array<{
    price: number | string;
  }>;
}

interface Recommendation {
  id: string;
  score: number;
  reason: string | null;
  algorithm: string;
  product: {
    id: string;
    name: string;
    subtitle: string | null;
    image: string | null;
    unit: string | null;
    popularityScore: number;
    purchaseCount: number;
    priceTiers: Array<{ price: number | string }>;
  };
  supplier: {
    id: string;
    companyName: string;
    avgRating: number;
  } | null;
}

interface Props {
  userId: string;
}

const FAVORITE_SUPPLIERS_KEY = 'favorite_suppliers';

// ==================== 工具函式 ====================

function loadFavorites(): Supplier[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITE_SUPPLIERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Supplier[];
  } catch {
    return [];
  }
}

function saveFavorites(suppliers: Supplier[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAVORITE_SUPPLIERS_KEY, JSON.stringify(suppliers));
}

function isFavorite(favorites: Supplier[], supplierId: string): boolean {
  return favorites.some((s) => s.id === supplierId);
}

// ==================== 星評元件 ====================

function StarRating({ rating }: { rating: number | null }) {
  const score = rating ?? 0;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${
            n <= Math.round(score)
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{score.toFixed(1)}</span>
    </span>
  );
}

// ==================== 加入購物車按鈕 ====================

function AddToCartButton({ productId }: { productId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '加入失敗');
      }
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <Button
      size="sm"
      variant={status === 'success' ? 'default' : 'outline'}
      className={`mt-2 w-full gap-1.5 text-xs h-7 ${
        status === 'success'
          ? 'bg-green-600 hover:bg-green-600 text-white border-green-600'
          : status === 'error'
          ? 'border-red-400 text-red-600'
          : 'text-blue-600 hover:bg-blue-50 hover:border-blue-400'
      }`}
      onClick={handleAddToCart}
      disabled={status === 'loading'}
    >
      <ShoppingCart className="w-3 h-3" />
      {status === 'loading' ? '加入中...' : status === 'success' ? '已加入！' : status === 'error' ? '加入失敗' : '加入購物車'}
    </Button>
  );
}

// ==================== 供應商卡片 ====================

interface SupplierCardProps {
  supplier: Supplier;
  isFav: boolean;
  onToggleFav: (supplier: Supplier) => void;
  showViewLink?: boolean;
}

function SupplierCard({ supplier, isFav, onToggleFav, showViewLink = false }: SupplierCardProps) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 truncate">
            {supplier.companyName}
          </span>
          {supplier.isVerified && (
            <Badge
              variant="outline"
              className="border-green-400 text-green-700 bg-green-50 flex items-center gap-1 px-1.5 py-0.5 text-xs"
            >
              <CheckCircle className="w-3 h-3" />
              已認證
            </Badge>
          )}
        </div>
        {supplier.industry && (
          <p className="mt-0.5 text-xs text-gray-500 truncate">
            {supplier.industry}
          </p>
        )}
        <div className="mt-1">
          <StarRating rating={supplier.avgRating} />
        </div>
        {showViewLink && (
          <Link
            href={`/suppliers/${supplier.id}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            查看商品頁面
          </Link>
        )}
      </div>
      <Button
        size="sm"
        variant={isFav ? 'default' : 'outline'}
        className={`ml-3 shrink-0 gap-1 text-xs ${
          isFav
            ? 'bg-yellow-400 hover:bg-yellow-500 text-white border-yellow-400'
            : 'text-gray-600 hover:text-yellow-600 hover:border-yellow-400'
        }`}
        onClick={() => onToggleFav(supplier)}
        aria-label={isFav ? '移除常用供應商' : '加入常用供應商'}
      >
        <Star
          className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`}
        />
        {isFav ? '已加入' : '加入常用'}
      </Button>
    </div>
  );
}

// ==================== 推薦商品卡片 ====================

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const startingPrice =
    rec.product.priceTiers?.length > 0
      ? parseFloat(String(rec.product.priceTiers[0].price))
      : null;

  const algorithmLabel: Record<string, string> = {
    COLLABORATIVE: '協同過濾',
    CONTENT_BASED: '內容推薦',
    TRENDING: '熱門商品',
    MANUAL: '編輯推薦',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {rec.product.image ? (
        <img
          src={rec.product.image}
          alt={rec.product.name}
          className="w-full h-28 object-cover rounded mb-2"
        />
      ) : (
        <div className="w-full h-28 bg-gray-100 rounded mb-2 flex items-center justify-center">
          <Package className="w-8 h-8 text-gray-300" />
        </div>
      )}
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm truncate">{rec.product.name}</p>
        {rec.product.subtitle && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{rec.product.subtitle}</p>
        )}
        {rec.supplier && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{rec.supplier.companyName}</p>
        )}
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          {algorithmLabel[rec.algorithm] && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
              {algorithmLabel[rec.algorithm]}
            </Badge>
          )}
          <span className="text-xs text-amber-600">
            匹配度 {Math.round(rec.score * 100)}%
          </span>
        </div>
        {startingPrice !== null ? (
          <p className="mt-1 text-sm font-semibold text-blue-700">
            NT$ {startingPrice.toLocaleString('zh-TW')} 起
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">價格洽談</p>
        )}
        {rec.reason && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">{rec.reason}</p>
        )}
      </div>
      <AddToCartButton productId={rec.product.id} />
    </div>
  );
}

// ==================== 主元件 ====================

export default function SupplierSelector({ userId: _userId }: Props) {
  // --- 常用供應商狀態 ---
  const [favorites, setFavorites] = useState<Supplier[]>([]);

  // --- 推薦商品狀態 ---
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);

  // --- 搜尋供應商狀態 ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Supplier[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 相似商品搜尋狀態 ---
  const [productKeyword, setProductKeyword] = useState('');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [hasSearchedProducts, setHasSearchedProducts] = useState(false);

  // ==================== 初始化 ====================

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // 載入個人化推薦
  useEffect(() => {
    const fetchRecs = async () => {
      setRecsLoading(true);
      setRecsError(null);
      try {
        const res = await fetch('/api/recommendations?limit=12');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRecommendations(json.data as Recommendation[]);
        }
      } catch {
        setRecsError('無法載入推薦，請稍後再試');
      } finally {
        setRecsLoading(false);
      }
    };
    fetchRecs();
  }, []);

  // ==================== 常用供應商操作 ====================

  const handleToggleFav = useCallback((supplier: Supplier) => {
    setFavorites((prev) => {
      let updated: Supplier[];
      if (isFavorite(prev, supplier.id)) {
        updated = prev.filter((s) => s.id !== supplier.id);
        setSelectedTargetIds((ids) => ids.filter((id) => id !== supplier.id));
      } else {
        updated = [...prev, supplier];
      }
      saveFavorites(updated);
      return updated;
    });
  }, []);

  // ==================== 供應商即時搜尋 ====================

  const fetchSuppliers = useCallback(async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({
        search: query,
        limit: '20',
        status: 'ACTIVE',
      });
      const res = await fetch(`/api/suppliers?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSearchResults(json.data as Supplier[]);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchError('搜尋供應商時發生錯誤，請稍後再試。');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers('');
  }, [fetchSuppliers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuppliers(value.trim());
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ==================== 相似商品搜尋 ====================

  const handleToggleTargetSupplier = (supplierId: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSearchProducts = async () => {
    if (!productKeyword.trim()) return;
    setIsSearchingProducts(true);
    setProductError(null);
    setHasSearchedProducts(true);

    try {
      const results: Product[] = [];
      const targets =
        selectedTargetIds.length > 0
          ? selectedTargetIds
          : [undefined];

      await Promise.all(
        targets.map(async (supplierId) => {
          const params = new URLSearchParams({
            search: productKeyword.trim(),
            limit: '10',
          });
          if (supplierId) params.set('supplierId', supplierId);

          const res = await fetch(`/api/products?${params.toString()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();

          if (json.success && Array.isArray(json.data)) {
            results.push(...(json.data as Product[]));
          } else if (Array.isArray(json)) {
            results.push(...(json as Product[]));
          }
        })
      );

      const seen = new Set<string>();
      const unique = results.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      setProductResults(unique);
    } catch {
      setProductError('搜尋商品時發生錯誤，請稍後再試。');
      setProductResults([]);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const handleProductKeywordKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') handleSearchProducts();
  };

  // ==================== 渲染 ====================

  return (
    <div className="space-y-6">

      {/* ===== 區塊零：個人化推薦 ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple-500" />
            為您推薦
            {recommendations.length > 0 && (
              <Badge variant="secondary" className="ml-1">{recommendations.length} 項</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recsLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <svg className="animate-spin w-5 h-5 mr-2 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">載入推薦中⋯</span>
            </div>
          ) : recsError ? (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {recsError}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Sparkles className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm">暫無個人化推薦</p>
              <p className="text-xs mt-1">完成更多採購後，系統將為您生成推薦</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 區塊一：常用供應商 ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            常用供應商
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Star className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm">尚未選取常用供應商</p>
              <p className="text-xs mt-1">
                請從下方搜尋結果中點擊「加入常用」
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((supplier) => (
                <div key={supplier.id} className="relative">
                  <SupplierCard
                    supplier={supplier}
                    isFav={true}
                    onToggleFav={handleToggleFav}
                    showViewLink={true}
                  />
                  <button
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors"
                    onClick={() => handleToggleFav(supplier)}
                    aria-label={`移除 ${supplier.companyName}`}
                    title="從常用中移除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 區塊二：供應商搜尋 ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5 text-blue-600" />
            搜尋供應商
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="輸入公司名稱、產業類別⋯"
              className="pl-9"
              aria-label="搜尋供應商"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setSearchQuery('');
                  fetchSuppliers('');
                }}
                aria-label="清除搜尋"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isSearching && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <svg className="animate-spin w-5 h-5 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">搜尋中⋯</span>
            </div>
          )}

          {searchError && !isSearching && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {searchError}
            </div>
          )}

          {!isSearching && !searchError && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Search className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm">找不到符合的供應商</p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  isFav={isFavorite(favorites, supplier.id)}
                  onToggleFav={handleToggleFav}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 區塊三：相似商品搜尋 ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-green-600" />
            搜尋相似商品
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              商品關鍵字
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  value={productKeyword}
                  onChange={(e) => setProductKeyword(e.target.value)}
                  onKeyDown={handleProductKeywordKeyDown}
                  placeholder="例如：體溫槍、口罩、防護衣⋯"
                  className="pl-9"
                  aria-label="商品關鍵字"
                />
              </div>
              <Button
                onClick={handleSearchProducts}
                disabled={!productKeyword.trim() || isSearchingProducts}
                className="shrink-0"
              >
                {isSearchingProducts ? '搜尋中⋯' : '搜尋相似商品'}
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              指定供應商（選填）
              <span className="ml-1 text-xs font-normal text-gray-400">
                — 從常用供應商中選取，不選則搜尋全平台
              </span>
            </label>
            {favorites.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                尚無常用供應商，請先加入常用供應商以縮小搜尋範圍。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {favorites.map((supplier) => {
                  const selected = selectedTargetIds.includes(supplier.id);
                  return (
                    <button
                      key={supplier.id}
                      onClick={() => handleToggleTargetSupplier(supplier.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600'
                      }`}
                      aria-pressed={selected}
                    >
                      {selected && (
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      {supplier.companyName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {productError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {productError}
            </div>
          )}

          {hasSearchedProducts && !isSearchingProducts && !productError && (
            <>
              {productResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Package className="w-10 h-10 mb-2 text-gray-300" />
                  <p className="text-sm">找不到符合的商品</p>
                  <p className="text-xs mt-1">請嘗試其他關鍵字或擴大供應商範圍</p>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-sm text-gray-500">
                    共找到{' '}
                    <span className="font-semibold text-gray-700">
                      {productResults.length}
                    </span>{' '}
                    項相關商品
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {productResults.map((product) => {
                      const startingPrice =
                        product.priceTiers && product.priceTiers.length > 0
                          ? parseFloat(String(product.priceTiers[0].price))
                          : null;

                      return (
                        <div
                          key={product.id}
                          className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <Package className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate text-sm">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {product.supplier?.companyName ?? '—'}
                              </p>
                              {startingPrice !== null ? (
                                <p className="mt-1 text-sm font-semibold text-blue-700">
                                  NT$ {startingPrice.toLocaleString('zh-TW')} 起
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-gray-400">
                                  價格洽談
                                </p>
                              )}
                            </div>
                          </div>
                          <AddToCartButton productId={product.id} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
