'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Filter, Search, MessageSquare, Truck, Shield, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SupplierRating {
  id: string;
  supplierId: string;
  companyName: string;
  avgRating: number;
  totalRatings: number;
  onTimeDeliveryRate: number;
  totalDeliveries: number;
}

export default function SupplierRatingsPage() {
  const [suppliers, setSuppliers] = useState<SupplierRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [minRating, setMinRating] = useState<string>('0');
  const [sortBy, setSortBy] = useState<string>('avgRating');

  useEffect(() => {
    fetchSupplierRatings();
  }, []);

  const fetchSupplierRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/suppliers');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const suppliersData = result.data.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            supplierId: s.id as string,
            companyName: s.companyName as string,
            avgRating: (s.avgRating as number) || 0,
            totalRatings: (s.totalRatings as number) || 0,
            onTimeDeliveryRate: (s.onTimeDeliveryRate as number) || 0,
            totalDeliveries: (s.totalDeliveries as number) || 0,
          }));
          setSuppliers(suppliersData);
        } else {
          console.error('獲取供應商評分失敗:', result.error);
        }
      } else {
        console.error('獲取供應商評分失敗，HTTP狀態:', response.status);
      }
    } catch (error) {
      console.error('獲取供應商評分失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = supplier.avgRating >= parseFloat(minRating);
    return matchesSearch && matchesRating;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'avgRating':
        return b.avgRating - a.avgRating;
      case 'totalRatings':
        return b.totalRatings - a.totalRatings;
      case 'deliveryRate':
        return b.onTimeDeliveryRate - a.onTimeDeliveryRate;
      default:
        return 0;
    }
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderDeliveryRate = (rate: number) => {
    const percentage = (rate * 100).toFixed(1);
    return (
      <div className="flex items-center">
        <Truck className="h-4 w-4 text-green-500 mr-2" />
        <span className="text-sm font-medium">{percentage}%</span>
        <span className="text-sm text-gray-500 ml-1">準時交貨</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">供應商評比</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">供應商評比</h1>
        <p className="text-gray-600">
          查看供應商的評分和評價，選擇最可靠的合作夥伴。所有評分均來自真實批發商的採購體驗。
        </p>
      </div>

      {/* 篩選和搜尋欄 */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="搜尋供應商名稱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger>
                  <SelectValue placeholder="最低評分" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">所有評分</SelectItem>
                  <SelectItem value="3">3 星以上</SelectItem>
                  <SelectItem value="4">4 星以上</SelectItem>
                  <SelectItem value="4.5">4.5 星以上</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avgRating">評分最高</SelectItem>
                  <SelectItem value="totalRatings">評價最多</SelectItem>
                  <SelectItem value="deliveryRate">交貨最準時</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">平均評分</p>
                <p className="text-2xl font-bold">
                  {suppliers.length > 0 
                    ? (suppliers.reduce((sum, s) => sum + s.avgRating, 0) / suppliers.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">平均準時交貨率</p>
                <p className="text-2xl font-bold">
                  {suppliers.length > 0
                    ? ((suppliers.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / suppliers.length) * 100).toFixed(1) + '%'
                    : '0%'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">總評價數</p>
                <p className="text-2xl font-bold">
                  {suppliers.reduce((sum, s) => sum + s.totalRatings, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 供應商列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="rounded-full bg-gray-100 p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">未找到供應商</h3>
            <p className="text-gray-500 mb-6">請嘗試不同的搜尋條件或篩選器</p>
            <Button onClick={() => { setSearchTerm(''); setMinRating('0'); }}>
              重設篩選條件
            </Button>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{supplier.companyName}</CardTitle>
                    <CardDescription className="mt-1">
                      {supplier.totalRatings} 個評價
                    </CardDescription>
                  </div>
                  <Badge variant={supplier.avgRating >= 4 ? 'default' : 'secondary'}>
                    {supplier.avgRating >= 4 ? '推薦' : '一般'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    {renderStars(supplier.avgRating)}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <ThumbsUp className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">產品品質</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {supplier.avgRating >= 4.5 ? '優秀' : supplier.avgRating >= 4 ? '良好' : '普通'}
                    </div>
                    <div className="flex items-center">
                      <Truck className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm">交貨準時</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {(supplier.onTimeDeliveryRate * 100).toFixed(0)}%
                    </div>
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-purple-500 mr-2" />
                      <span className="text-sm">客戶服務</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {supplier.avgRating >= 4 ? '優質' : '標準'}
                    </div>
                  </div>
                  {renderDeliveryRate(supplier.onTimeDeliveryRate)}
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = `/supplier-ratings/${supplier.supplierId}`}
                    >
                      查看詳細評價
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 行動呼籲 */}
      <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">分享您的採購體驗</h3>
            <p className="text-gray-600 mb-4">
              您的評價可以幫助其他批發商做出更好的採購決策，同時也讓供應商了解如何改進服務。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-blue-600 hover:bg-blue-700">
                為最近採購的供應商評分
              </Button>
              <Button variant="outline">
                查看評價指南
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}