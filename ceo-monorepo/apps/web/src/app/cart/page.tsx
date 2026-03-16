'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, CreditCard } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  savings: number;
  product: {
    id: string;
    name: string;
    subtitle: string | null;
    image: string | null;
    unit: string;
    spec: string | null;
    priceTiers: Array<{ minQty: number; price: number }>;
    firm: string | null;
  };
}

interface CartResponse {
  items: CartItem[];
  summary: {
    totalItems: number;
    totalAmount: number;
    totalSavings: number;
    finalAmount: number;
  };
}

export default function CartPage() {
  const router = useRouter();
  const [cartData, setCartData] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCart();
  }, []);

  async function fetchCart() {
    try {
      setLoading(true);
      const res = await fetch('/api/cart');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setCartData(data);
      // 初始化數量狀態
      const initialQuantities: Record<string, number> = {};
      data.items.forEach((item: CartItem) => {
        initialQuantities[item.id] = item.quantity;
      });
      setQuantities(initialQuantities);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入購物車失敗');
      console.error('購物車載入錯誤:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals
  const subtotal = cartData?.summary.totalAmount || 0;
  const shipping = subtotal > 0 ? 150 : 0; // Fixed shipping cost
  const total = subtotal + shipping;

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) newQuantity = 1;
    try {
      // 更新伺服器端數量
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (!res.ok) throw new Error('更新數量失敗');
      // 更新本地狀態
      setQuantities(prev => ({ ...prev, [itemId]: newQuantity }));
      // 重新獲取購物車以確保數據一致
      fetchCart();
    } catch (err) {
      console.error('更新數量錯誤:', err);
      alert('更新數量失敗，請稍後再試');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('移除項目失敗');
      // 從本地狀態移除
      setQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[itemId];
        return newQuantities;
      });
      // 重新獲取購物車
      fetchCart();
    } catch (err) {
      console.error('移除項目錯誤:', err);
      alert('移除項目失敗，請稍後再試');
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">購物車</h1>
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">購物車</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">錯誤：</strong> {error}
          </div>
          <Button onClick={fetchCart} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  const items = cartData?.items || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">購物車</h1>
        
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">您的購物車是空的</p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/products')}
            >
              瀏覽商品
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <div className="flex">
                    <div className="w-24 h-24 bg-gray-200 m-4 flex-shrink-0">
                      <img 
                        src={item.product.image || '/placeholder-product.svg'} 
                        alt={item.product.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    <div className="flex-1 p-4">
                      <CardHeader className="p-0">
                        <CardTitle>{item.product.name}</CardTitle>
                      </CardHeader>
                      
                      <CardContent className="p-0 pt-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-red-600 font-bold">${item.unitPrice}/{item.product.unit}</p>
                            <p className="text-sm text-gray-500">小計: ${item.subtotal}</p>
                            {item.savings > 0 && (
                              <p className="text-sm text-green-600">節省: ${item.savings}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item.id, quantities[item.id] - 1)}
                              disabled={quantities[item.id] <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            
                            <Input
                              type="number"
                              min="1"
                              value={quantities[item.id] || 0}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 mx-2 text-center"
                            />
                            
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item.id, quantities[item.id] + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="p-0 pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          移除
                        </Button>
                      </CardFooter>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Order summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>訂單摘要</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>小計</span>
                      <span>${subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>運費</span>
                      <span>${shipping}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>總計</span>
                      <span>${total}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700" 
                    onClick={handleCheckout}
                    disabled={items.length === 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    結帳
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-2" 
                    onClick={() => router.push('/products')}
                  >
                    繼續購物
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}