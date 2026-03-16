'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, MapPin, User, Phone, Mail } from 'lucide-react';

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

export default function CheckoutPage() {
  const router = useRouter();
  const [orderNote, setOrderNote] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [cartData, setCartData] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Mock user data (temporary)
  const userData = {
    name: '王大明',
    taxId: '12345678',
    email: 'user@example.com',
    phone: '0912-345-678',
    billingAddress: '台北市中山區南京東路一段123號',
    shippingAddress: '台北市中山區南京東路一段123號',
  };

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Process order
      const orderId = new Date().getTime();
      // 這裡應該呼叫訂單 API
      // await fetch('/api/orders', { method: 'POST', body: JSON.stringify({...}) });
      
      console.log(`訂單已送出！訂單編號：${orderId}`);
      router.push('/orders');
    } catch (error) {
      console.error('訂單提交失敗:', error);
      alert('訂單提交失敗，請稍後再試');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">結帳</h1>
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
          <h1 className="text-3xl font-bold mb-8">結帳</h1>
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
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">結帳</h1>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">您的購物車是空的</p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/cart')}
            >
              返回購物車
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">結帳</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>訂單摘要</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <div className="w-16 h-16 bg-gray-200 mr-4">
                      <img 
                        src={item.product.image || '/placeholder-product.svg'} 
                        alt={item.product.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-sm text-gray-600">數量: {item.quantity} {item.product.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.subtotal}</p>
                      <p className="text-sm text-gray-600">${item.unitPrice}/{item.product.unit}</p>
                      {item.savings > 0 && (
                        <p className="text-sm text-green-600">節省: ${item.savings}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span>小計</span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>運費</span>
                    <span>${shipping}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>總計</span>
                    <span>${total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Checkout form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>配送與付款資訊</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    聯絡資訊
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">姓名</Label>
                      <Input id="name" defaultValue={userData.name} />
                    </div>
                    <div>
                      <Label htmlFor="taxId">統一編號</Label>
                      <Input id="taxId" defaultValue={userData.taxId} />
                    </div>
                    <div>
                      <Label htmlFor="email">電子郵件</Label>
                      <Input id="email" type="email" defaultValue={userData.email} />
                    </div>
                    <div>
                      <Label htmlFor="phone">電話</Label>
                      <Input id="phone" defaultValue={userData.phone} />
                    </div>
                  </div>
                </div>
                
                {/* Billing Address */}
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    發票寄送地址
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="billing-address">地址</Label>
                      <Input id="billing-address" defaultValue={userData.billingAddress} />
                    </div>
                  </div>
                </div>
                
                {/* Shipping Address */}
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    收貨地址
                  </h3>
                  
                  <div className="flex items-center mb-3">
                    <Checkbox 
                      id="same-as-billing" 
                      checked={sameAsBilling}
                      onCheckedChange={(checked) => setSameAsBilling(!!checked)}
                    />
                    <Label htmlFor="same-as-billing" className="ml-2">
                      與發票寄送地址相同
                    </Label>
                  </div>
                  
                  {!sameAsBilling && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="shipping-address">地址</Label>
                        <Input id="shipping-address" defaultValue={userData.shippingAddress} />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Order Notes */}
                <div>
                  <Label htmlFor="order-notes">訂單備註</Label>
                  <Textarea 
                    id="order-notes" 
                    placeholder="如有特殊需求請在此說明..." 
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                  />
                </div>
                
                {/* Payment Method */}
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    付款方式
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Input type="radio" id="payment-card" name="payment" defaultChecked />
                      <Label htmlFor="payment-card" className="ml-2">信用卡</Label>
                    </div>
                    <div className="flex items-center">
                      <Input type="radio" id="payment-atm" name="payment" />
                      <Label htmlFor="payment-atm" className="ml-2">ATM轉帳</Label>
                    </div>
                    <div className="flex items-center">
                      <Input type="radio" id="payment-cod" name="payment" />
                      <Label htmlFor="payment-cod" className="ml-2">貨到付款</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                 <Button 
                   className="w-full bg-blue-600 hover:bg-blue-700" 
                   onClick={handlePlaceOrder}
                   disabled={isSubmitting}
                 >
                   {isSubmitting ? '處理中...' : `確認下單 - $${total}`}
                 </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => router.back()}
                >
                  返回購物車
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}