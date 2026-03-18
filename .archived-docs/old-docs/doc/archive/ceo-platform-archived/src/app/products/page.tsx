'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, SlidersHorizontal, Loader2, AlertCircle, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  price: number | string;
  originalPrice?: number | string;
  discount?: number;
  image: string | null;
  unit: string;
  totalSold: number;
  priceTiers: { minQty: number; price: number | string }[];
  category: string;
  firm: string;
  featured: boolean;
}

interface Category {
  id: number;
  name: string;
  level: number;
  children: Category[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ProductsResponse {
  data: Product[];
  pagination: Pagination;
}

// 計算集購進度
function calculateGroupBuyProgress(product: Product): { current: number; target: number; percentage: number } {
  if (!product.priceTiers || product.priceTiers.length === 0) {
    return { current: 0, target: 0, percentage: 0 };
  }

  const current = product.totalSold || 0;
  
  // Find the next price tier threshold
  const sortedTiers = [...product.priceTiers].sort((a, b) => a.minQty - b.minQty);
  let target = sortedTiers[sortedTiers.length - 1].minQty; // Default to highest tier
  
  // Find the next tier that hasn't been reached yet
  for (const tier of sortedTiers) {
    if (current < tier.minQty) {
      target = tier.minQty;
      break;
    }
  }
  
  // If current exceeds all tiers, use the next logical target (e.g., current + 10%)
  if (current >= target) {
    target = Math.max(current, Math.ceil(current * 1.1)); // 10% more than current
  }
  
  const percentage = Math.min(100, Math.round((current / target) * 100));
  
  return { current, target, percentage };
}

import { Suspense } from 'react';

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('featured');
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Extract search term from URL params
  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchParams]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data: Category[] = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        
        if (searchTerm) {
          params.set('search', searchTerm);
        }
        
        if (selectedCategoryId) {
          params.set('categoryId', selectedCategoryId);
        }
        
        // Map sort options to API params
        let sortBy = 'featured';
        let order: 'asc' | 'desc' = 'desc';
        
        switch (sortOption) {
          case 'price-low':
            sortBy = 'price';
            order = 'asc';
            break;
          case 'price-high':
            sortBy = 'price';
            order = 'desc';
            break;
          case 'name':
            sortBy = 'name';
            order = 'asc';
            break;
          case 'featured':
          default:
            sortBy = 'featured';
            order = 'desc';
            break;
        }
        
        params.set('sortBy', sortBy);
        params.set('order', order);
        params.set('page', '1');
        params.set('limit', '20');

        const response = await fetch(`/api/products?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data: ProductsResponse = await response.json();
        setProducts(data.data);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm, selectedCategoryId, sortOption]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`?search=${encodeURIComponent(searchTerm)}`);
    } else {
      router.push('?');
    }
  };

  // Flatten categories for display (all levels)
  const flattenCategories = (cats: Category[], level = 0): { category: Category; level: number }[] => {
    const result: { category: Category; level: number }[] = [];
    cats.forEach(cat => {
      result.push({ category: cat, level });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  const flattenedCategories = flattenCategories(categories);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">商品列表</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <SlidersHorizontal className="mr-2 h-5 w-5" />
                篩選條件
              </h2>
              
              <div className="mb-6">
                <h3 className="font-medium mb-2">分類</h3>
                <div className="space-y-2">
                  <Button
                    variant={selectedCategoryId === null ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    全部 ({pagination?.total || 0})
                  </Button>
                  {flattenedCategories.map(({ category, level }) => (
                    <Button
                      key={category.id}
                      variant={selectedCategoryId === String(category.id) ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      style={{ paddingLeft: `${(level + 1) * 0.75 + 1}rem` }}
                      onClick={() => setSelectedCategoryId(String(category.id))}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">排序</h3>
                <div className="space-y-2">
                  <Button
                    variant={sortOption === 'featured' ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSortOption('featured')}
                  >
                    熱門優先
                  </Button>
                  <Button
                    variant={sortOption === 'price-low' ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSortOption('price-low')}
                  >
                    價格由低到高
                  </Button>
                  <Button
                    variant={sortOption === 'price-high' ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSortOption('price-high')}
                  >
                    價格由高到低
                  </Button>
                  <Button
                    variant={sortOption === 'name' ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSortOption('name')}
                  >
                    名稱 A-Z
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            {/* Search bar */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="搜尋商品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="py-3 pl-10 pr-4 rounded-full shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </form>
            
            {/* Loading state */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">載入中...</span>
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="flex flex-col justify-center items-center py-12 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  重新載入
                </Button>
              </div>
            )}

            {/* Products grid */}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {products.map((product) => {
                     const progress = calculateGroupBuyProgress(product);
                     return (
                       <Card key={product.id} className="overflow-hidden">
                          <div className="relative h-48 bg-gray-200">
                            {product.image ? (
                              <Image 
                                src={product.image} 
                                alt={product.name} 
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-400">
                                <Package className="h-12 w-12" />
                              </div>
                            )}
                            {product.featured && (
                              <Badge className="absolute top-2 left-2 bg-red-500">熱門</Badge>
                            )}
                          </div>
                          <CardHeader>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <div className="text-sm text-muted-foreground">
                              <span>{product.category}</span>
                              <span className="text-xs text-gray-500 block mt-1">{product.firm}</span>
                            </div>
                          </CardHeader>
                         <CardContent>
                           {/* 集購進度條 */}
                           <div className="mb-3">
                             <Progress 
                               value={progress.current}
                               max={progress.target}
                               showValue={false}
                               color="green"
                               size="sm"
                             />
                             <div className="mt-1 text-xs text-gray-600 flex justify-between">
                               <span>集購</span>
                               <span className="font-medium">
                                 {progress.current}/{progress.target} {product.unit || '單位'}
                               </span>
                             </div>
                           </div>
                           
                           <div className="flex justify-between items-center">
                             <div>
                               <span className="text-red-600 font-bold">${product.price}</span>
                               <span className="line-through text-gray-500 ml-2 text-sm">${product.originalPrice}</span>
                             </div>
                             <Button 
                               size="sm" 
                               onClick={() => router.push(`/products/${product.id}`)}
                             >
                               詳情
                             </Button>
                           </div>
                         </CardContent>
                       </Card>
                     );
                   })}
                </div>
                
                {products.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">沒有找到符合條件的商品</p>
                  </div>
                )}

                {/* Pagination info */}
                {pagination && products.length > 0 && (
                  <div className="mt-6 text-center text-gray-500 text-sm">
                    顯示 {products.length} 筆商品，共 {pagination.total} 筆
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">載入中...</span>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
