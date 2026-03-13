'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Users, FileText, Truck } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'product' | 'supplier' | 'template' | 'prediction';
  title: string;
  description: string;
  category: string;
  relevance: number;
  url: string;
  metadata?: Record<string, any>;
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">載入中...</p>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'product' | 'supplier' | 'template' | 'prediction'>('all');

  // 模擬搜尋結果
  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'product',
      title: '批發電子產品套裝',
      description: '高品質電子產品批發套裝，包含多種熱門商品',
      category: '電子產品',
      relevance: 95,
      url: '/products/1',
      metadata: { price: 'NT$ 15,000', stock: 500 }
    },
    {
      id: '2',
      type: 'supplier',
      title: '台灣電子供應商有限公司',
      description: '專業電子產品供應商，提供 OEM/ODM 服務',
      category: '供應商',
      relevance: 88,
      url: '/suppliers/2',
      metadata: { rating: 4.8, deliveryTime: '3-5 天' }
    },
    {
      id: '3',
      type: 'template',
      title: '電子產品採購模板',
      description: '標準化電子產品採購流程模板',
      category: '採購模板',
      relevance: 82,
      url: '/purchase-templates/3',
      metadata: { downloads: 150, rating: 4.5 }
    },
    {
      id: '4',
      type: 'product',
      title: '辦公用品批發套裝',
      description: '辦公室必需品批發套裝，包含文具、耗材等',
      category: '辦公用品',
      relevance: 78,
      url: '/products/4',
      metadata: { price: 'NT$ 8,500', stock: 300 }
    },
    {
      id: '5',
      type: 'prediction',
      title: '電子產品交貨預測',
      description: '基於歷史數據的電子產品交貨時間預測',
      category: '交貨預測',
      relevance: 75,
      url: '/delivery-predictions/5',
      metadata: { accuracy: '92%', lastUpdated: '2026-03-08' }
    },
    {
      id: '6',
      type: 'supplier',
      title: '辦公用品批發商',
      description: '專業辦公用品批發供應商，提供一站式採購服務',
      category: '供應商',
      relevance: 72,
      url: '/suppliers/6',
      metadata: { rating: 4.6, deliveryTime: '2-4 天' }
    }
  ];

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = (searchTerm: string) => {
    setLoading(true);
    setSearchQuery(searchTerm);
    
    // 模擬 API 呼叫延遲
    setTimeout(() => {
      // 根據搜尋詞過濾結果
      const filteredResults = mockResults.filter(result => 
        result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setResults(filteredResults);
      setLoading(false);
    }, 500);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return <Package className="h-5 w-5" />;
      case 'supplier': return <Users className="h-5 w-5" />;
      case 'template': return <FileText className="h-5 w-5" />;
      case 'prediction': return <Truck className="h-5 w-5" />;
      default: return <Search className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return '商品';
      case 'supplier': return '供應商';
      case 'template': return '採購模板';
      case 'prediction': return '交貨預測';
      default: return '其他';
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return 'bg-blue-100 text-blue-800';
      case 'supplier': return 'bg-green-100 text-green-800';
      case 'template': return 'bg-purple-100 text-purple-800';
      case 'prediction': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredResults = activeFilter === 'all' 
    ? results 
    : results.filter(result => result.type === activeFilter);

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb 
        items={[
          { label: '首頁', href: '/' },
          { label: '搜尋結果', href: '/search' }
        ]}
      />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">搜尋結果</h1>
        <p className="text-gray-600 mb-8">
          {query ? `搜尋「${query}」的結果` : '請輸入搜尋關鍵字'}
        </p>

        {/* 搜尋表單 */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="search"
                placeholder="搜尋商品、供應商、採購模板..."
                className="pl-10 pr-4 py-3"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="搜尋輸入框"
              />
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" 
                aria-hidden="true"
              />
            </div>
            <Button type="submit" className="px-6">
              搜尋
            </Button>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            提示：使用更具體的關鍵字可以獲得更好的搜尋結果
          </div>
        </form>

        {/* 篩選器 */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              aria-label="顯示所有結果"
            >
              全部
            </Button>
            <Button
              variant={activeFilter === 'product' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('product')}
              aria-label="篩選商品結果"
            >
              商品
            </Button>
            <Button
              variant={activeFilter === 'supplier' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('supplier')}
              aria-label="篩選供應商結果"
            >
              供應商
            </Button>
            <Button
              variant={activeFilter === 'template' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('template')}
              aria-label="篩選採購模板結果"
            >
              採購模板
            </Button>
            <Button
              variant={activeFilter === 'prediction' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('prediction')}
              aria-label="篩選交貨預測結果"
            >
              交貨預測
            </Button>
          </div>
        </div>

        {/* 搜尋結果 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">搜尋中...</p>
          </div>
        ) : query && filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">找不到相關結果</h3>
            <p className="text-gray-600 mb-4">
              沒有找到與「{query}」相關的內容
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">建議：</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                <li>檢查關鍵字是否拼寫正確</li>
                <li>嘗試使用不同的關鍵字</li>
                <li>使用更通用的搜尋詞</li>
                <li>減少篩選條件</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              找到 {filteredResults.length} 個結果
              {activeFilter !== 'all' && `（${getTypeLabel(activeFilter)}）`}
            </div>

            {filteredResults.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                        {getTypeIcon(result.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          <Link 
                            href={result.url} 
                            className="hover:text-blue-600 transition-colors"
                            aria-label={`查看 ${result.title}`}
                          >
                            {result.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {result.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${getTypeColor(result.type)} border-0`}
                    >
                      {getTypeLabel(result.type)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">相關度：</span>
                      <span className="font-medium">{result.relevance}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">分類：</span>
                      <span className="font-medium">{result.category}</span>
                    </div>
                    {result.metadata && Object.entries(result.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="text-gray-500">{key}：</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button asChild variant="outline" size="sm">
                    <Link href={result.url} aria-label={`查看 ${result.title} 詳情`}>
                      查看詳情
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* 搜尋建議 */}
        {!loading && results.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-4">相關搜尋建議</h3>
            <div className="flex flex-wrap gap-2">
              {['批發', '供應商評比', '採購流程', '庫存管理', '價格比較'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(suggestion);
                    window.history.pushState({}, '', `/search?q=${encodeURIComponent(suggestion)}`);
                    performSearch(suggestion);
                  }}
                  aria-label={`搜尋 ${suggestion}`}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}