'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, X, Package } from 'lucide-react';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image: string | null;
}

interface Order {
  id: number;
  orderNo: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface OrdersResponse {
  data: Order[];
  pagination: Pagination;
}

import { Suspense } from 'react';

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const statusFilter = searchParams.get('status') || '';
  const orderNoFilter = searchParams.get('orderNo') || '';

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'CONFIRMED': return 'default';
      case 'SHIPPED': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '待處理';
      case 'CONFIRMED': return '已確認';
      case 'SHIPPED': return '已出貨';
      case 'COMPLETED': return '已完成';
      case 'CANCELLED': return '已取消';
      default: return status;
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/orders?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data: OrdersResponse = await response.json();

      // Client-side filtering for order number search
      if (orderNoFilter) {
        data.data = data.data.filter((order) =>
          order.orderNo.toLowerCase().includes(orderNoFilter.toLowerCase())
        );
      }

      // Client-side filtering for date range
      if (startDate || endDate) {
        data.data = data.data.filter((order) => {
          const orderDate = new Date(order.createdAt);
          if (startDate && new Date(startDate) > orderDate) return false;
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            if (endDateTime < orderDate) return false;
          }
          return true;
        });
      }

      setOrders(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('無法載入訂單資料');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, orderNoFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    router.push(`/orders?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/orders?${params.toString()}`);
  };

  const handleSearchOrderNo = (query: string) => {
    setSearchQuery(query);
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('orderNo', query);
    } else {
      params.delete('orderNo');
    }
    params.set('page', '1');
    router.push(`/orders?${params.toString()}`);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    fetchOrders();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    router.push('/orders');
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('確定要取消此訂單嗎？')) {
      return;
    }
    
    setCancellingOrderId(orderId);
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }
      
      toast.success('訂單已取消');
      fetchOrders();
    } catch {
      toast.error('取消訂單失敗，請稍後再試');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">我的訂單</h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">我的訂單</h1>
          <div className="text-center py-12">
            <p className="text-red-500 text-lg mb-4">載入訂單時發生錯誤</p>
            <Button onClick={fetchOrders}>重新載入</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">我的訂單</h1>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">搜尋和篩選</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Number Search */}
            <div className="space-y-2">
              <Label htmlFor="search-order">訂單編號</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-order"
                    placeholder="搜尋訂單編號..."
                    value={searchQuery}
                    onChange={(e) => handleSearchOrderNo(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSearchOrderNo('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">開始日期</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">結束日期</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                  min={startDate}
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || statusFilter || startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="w-full"
              >
                清除所有篩選
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Status Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('')}
            >
              全部
            </Button>
            <Button
              variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('PENDING')}
            >
              待處理
            </Button>
            <Button
              variant={statusFilter === 'CONFIRMED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('CONFIRMED')}
            >
              已確認
            </Button>
            <Button
              variant={statusFilter === 'SHIPPED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('SHIPPED')}
            >
              已出貨
            </Button>
            <Button
              variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('COMPLETED')}
            >
              已完成
            </Button>
            <Button
              variant={statusFilter === 'CANCELLED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('CANCELLED')}
            >
              已取消
            </Button>
          </div>
        </div>
        
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <CardTitle>訂單編號: {order.orderNo}</CardTitle>
                    <CardDescription>訂購日期: {formatDate(order.createdAt)}</CardDescription>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">訂單明細:</h3>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gray-200 mr-3 flex items-center justify-center">
                             {item.image ? (
                               <Image 
                                 src={item.image} 
                                 alt={item.name} 
                                 width={48}
                                 height={48}
                                 className="w-full h-full object-contain"
                               />
                             ) : (
                               <Package className="h-6 w-6 text-gray-400" />
                             )}
                           </div>
                          <span>{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p>{item.quantity} x ${item.price} = ${item.quantity * item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-lg font-semibold">總計: ${order.totalAmount}</p>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      訂單詳情
                    </Button>
                    {order.status === 'PENDING' && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingOrderId === order.id}
                      >
                        {cancellingOrderId === order.id ? '取消中...' : '取消訂單'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              上一頁
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
            >
              下一頁
            </Button>
          </div>
        )}
        
        {/* Empty State */}
        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">您還沒有任何訂單</p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/products')}
            >
              開始購物
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">我的訂單</h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
