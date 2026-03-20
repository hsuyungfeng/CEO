'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Store,
  ClipboardList,
  AlertCircle,
  ChevronRight,
  Package,
  FileText,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  pendingOrders: number;
  pendingSuppliers: number;
  totalSuppliers: number;
  totalMembers: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(n);

export default function AdminDashboard() {
  const router = useRouter();
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

  if (loading && !data) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">載入中...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-8 text-center">
        <div className="text-red-600 mb-2">載入失敗</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <Button onClick={() => fetchDashboardData(period)}>重試</Button>
      </div>
    );
  }

  if (!data) return null;

  const periodStats = [
    { title: `${period === 'today' ? '今日' : period === 'week' ? '本週' : period === 'month' ? '本月' : '本年'}訂單`, value: data.totalOrders.toLocaleString(), icon: ShoppingCart, color: 'text-blue-500' },
    { title: '營業額', value: fmt(data.totalRevenue), icon: DollarSign, color: 'text-green-500' },
    { title: '新增會員', value: data.activeUsers.toLocaleString(), icon: Users, color: 'text-purple-500' },
  ];

  const globalStats = [
    { title: '活躍供應商', value: data.totalSuppliers.toLocaleString(), icon: Store, color: 'text-orange-500' },
    { title: '活躍會員', value: data.totalMembers.toLocaleString(), icon: Users, color: 'text-indigo-500' },
  ];

  const actionItems = [
    {
      label: '待確認訂單',
      count: data.pendingOrders,
      href: '/admin/orders/pending',
      icon: ClipboardList,
      urgent: data.pendingOrders > 0,
      desc: '點擊前往確認',
    },
    {
      label: '待審核供應商',
      count: data.pendingSuppliers,
      href: '/admin/suppliers',
      icon: Store,
      urgent: data.pendingSuppliers > 0,
      desc: '點擊前往審核',
    },
  ];

  const quickLinks = [
    { label: '訂單管理', href: '/admin/orders', icon: ShoppingCart },
    { label: '供應商管理', href: '/admin/suppliers', icon: Store },
    { label: '會員管理', href: '/admin/members', icon: Users },
    { label: '商品管理', href: '/admin/products', icon: Package },
    { label: '團購管理', href: '/admin/groups', icon: BarChart3 },
    { label: '帳單管理', href: '/admin/invoices', icon: FileText },
    { label: '聯絡訊息', href: '/admin/messages', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理儀表板</h1>
          <p className="mt-1 text-sm text-gray-500">CEO B2B 平台管理後台</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="時間範圍" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本週</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchDashboardData(period)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 待處理行動項目 */}
      {(data.pendingOrders > 0 || data.pendingSuppliers > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {actionItems.filter(a => a.count > 0).map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">{item.label}</p>
                  <p className="text-xs text-amber-600">{item.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-white">{item.count}</Badge>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 期間統計 */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">期間統計</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {periodStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 全站累計 */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">全站累計</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {globalStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 快速連結 */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">快速導覽</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ label, href, icon: Icon }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 hover:border-blue-200 transition-colors text-left"
            >
              <Icon className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
