'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalUsers: number;
    totalProducts: number;
  };
  orderStats: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  revenueTrend: Array<{
    date: string;
    amount: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    totalSold: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNo: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    customerName: string;
    customerTaxId: string;
  }>;
  recentMessages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    createdAt: string;
  }>;
  period: string;
  startDate: string;
  endDate: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState('today');

  const fetchDashboardData = async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/dashboard?period=${selectedPeriod}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '載入儀表板數據失敗');
        toast.error(result.error || '載入儀表板數據失敗');
      }
    } catch (err) {
      setError('網絡錯誤，請稍後再試');
      toast.error('網絡錯誤，請稍後再試');
      console.error('載入儀表板數據錯誤:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(period);
  }, [period]);

  const handleRefresh = () => {
    fetchDashboardData(period);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '待處理';
      case 'CONFIRMED':
        return '已確認';
      case 'SHIPPED':
        return '已出貨';
      case 'COMPLETED':
        return '已完成';
      case 'CANCELLED':
        return '已取消';
      default:
        return status;
    }
  };

  if (loading && !data) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">載入儀表板數據中...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-8 text-center">
        <div className="text-red-600 mb-2">載入失敗</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <Button onClick={handleRefresh}>重試</Button>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      title: '總訂單數',
      value: data.summary.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      change: '+12%',
    },
    {
      title: '總營業額',
      value: formatCurrency(data.summary.totalRevenue),
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-500',
      change: '+18%',
    },
    {
      title: '新增會員',
      value: data.summary.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
      change: '+5%',
    },
    {
      title: '新增商品',
      value: data.summary.totalProducts.toLocaleString(),
      icon: Package,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500',
      change: '+8%',
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">儀表板</h1>
          <p className="mt-2 text-gray-600">歡迎使用 CEO 團購電商管理後台</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="時間範圍" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本週</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="mr-1 h-3 w-3" />
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左側：訂單狀態與最近訂單 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 訂單狀態統計 */}
          <Card>
            <CardHeader>
              <CardTitle>訂單狀態分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.orderStats.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(stat.status)}>
                        {getStatusText(stat.status)}
                      </Badge>
                      <span className="text-sm text-gray-600">{stat.count} 筆</span>
                    </div>
                    <div className="w-48">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {stat.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近訂單 */}
          <Card>
            <CardHeader>
              <CardTitle>最近訂單</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{order.orderNo}</p>
                      <p className="text-sm text-gray-500">
                        {order.customerName} ({order.customerTaxId})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：熱門商品與最近訊息 */}
        <div className="space-y-6">
          {/* 熱門商品 */}
          <Card>
            <CardHeader>
              <CardTitle>熱門商品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topProducts.map((product) => (
                  <div key={product.productId} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      {product.productImage ? (
                        <div className="h-10 w-10 rounded-md bg-gray-100 overflow-hidden relative">
                          <Image
                            src={product.productImage}
                            alt={product.productName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{product.productName}</p>
                        <p className="text-xs text-gray-500">已售 {product.totalSold} 件</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近聯絡訊息 */}
          <Card>
            <CardHeader>
              <CardTitle>最近聯絡訊息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentMessages.map((message) => (
                  <div key={message.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <p className="font-medium text-sm">{message.name}</p>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-1">{message.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`mailto:${message.email}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      回覆
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 營業額趨勢 */}
          <Card>
            <CardHeader>
              <CardTitle>營業額趨勢</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.revenueTrend.slice(-5).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{formatDate(day.date)}</span>
                    <span className="text-sm font-medium">{formatCurrency(day.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
