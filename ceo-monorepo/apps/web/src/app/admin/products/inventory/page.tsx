'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Edit2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  lastUpdated: string;
  status: 'normal' | 'low' | 'critical' | 'overstock';
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/inventory');
      const result = await response.json();

      if (result.success) {
        setItems(result.data);
      } else {
        toast.error(result.error || '載入庫存失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('載入庫存錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditQuantity(item.currentStock.toString());
    setShowEditDialog(true);
  };

  const handleSaveInventory = async () => {
    if (!selectedItem || !editQuantity) return;

    try {
      const response = await fetch(`/api/admin/inventory/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: parseInt(editQuantity) }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('庫存更新成功');
        setShowEditDialog(false);
        fetchInventory();
      } else {
        toast.error(result.error || '更新庫存失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('更新庫存錯誤:', error);
    }
  };

  const filteredItems = items.filter(item =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'low':
        return 'text-orange-600 bg-orange-50';
      case 'overstock':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      critical: '缺貨警告',
      low: '庫存不足',
      overstock: '庫存過多',
      normal: '正常',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">載入庫存資料中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">庫存管理</h1>
          <p className="mt-2 text-gray-600">查看和管理商品庫存</p>
        </div>
        <Button onClick={fetchInventory} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* 搜尋欄 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm mb-2 block">
                搜尋商品名稱或 SKU
              </Label>
              <Input
                id="search"
                placeholder="輸入商品名稱或 SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 庫存統計 */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">總商品數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">缺貨警告</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {items.filter(i => i.status === 'critical').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">庫存不足</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {items.filter(i => i.status === 'low').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">庫存過多</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {items.filter(i => i.status === 'overstock').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 庫存表格 */}
      <Card>
        <CardHeader>
          <CardTitle>庫存列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名稱</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">當前庫存</TableHead>
                  <TableHead className="text-right">最小庫存</TableHead>
                  <TableHead className="text-right">最大庫存</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-gray-600">{item.sku}</TableCell>
                      <TableCell className="text-right font-bold">{item.currentStock}</TableCell>
                      <TableCell className="text-right text-gray-600">{item.minStock}</TableCell>
                      <TableCell className="text-right text-gray-600">{item.maxStock}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status === 'critical' && <AlertTriangle className="h-3 w-3" />}
                          {getStatusLabel(item.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? '無符合的搜尋結果' : '暫無庫存資料'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 編輯庫存對話框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯庫存</DialogTitle>
            <DialogDescription>
              更新 {selectedItem?.productName} 的庫存數量
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">庫存數量</Label>
              <Input
                id="quantity"
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                min="0"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>最小庫存: {selectedItem?.minStock}</p>
              <p>最大庫存: {selectedItem?.maxStock}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveInventory} className="flex-1">
                儲存
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
