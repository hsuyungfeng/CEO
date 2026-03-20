'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CreditCard, MapPin, User, Package, ShoppingBag, MessageSquare } from 'lucide-react';

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
    unit: string | null;
    spec: string | null;
    priceTiers: Array<{ minQty: number; price: number }>;
    firm: string | null;
  };
}

interface UserData {
  name: string;
  taxId: string;
  email: string;
  phone?: string | null;
  member?: {
    shippingAddress?: string | null;
  } | null;
}

const fmt = (n: number) => `NT$ ${Number(n).toLocaleString('zh-TW')}`;

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<UserData | null>(null);

  // 表單狀態
  const [orderNote, setOrderNote] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'ATM' | 'COD'>('ATM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 從 localStorage 讀取購物車備註
  const [cartNotes, setCartNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([fetchCart(), fetchUser()]);
    try {
      const raw = localStorage.getItem('cart_notes');
      if (raw) setCartNotes(JSON.parse(raw));
    } catch {}
  }, []);

  async function fetchCart() {
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const loadedItems: CartItem[] = data.items || [];
      setItems(loadedItems);
      setTotalAmount(data.summary?.totalAmount ?? 0);
      setTotalSavings(data.summary?.totalSavings ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入購物車失敗');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        const u = data.user as UserData;
        setUser(u);
        setShippingAddress(u.member?.shippingAddress ?? '');
      }
    } catch {}
  }

  async function handlePlaceOrder() {
    if (isSubmitting || items.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: orderNote || undefined,
          shippingAddress: sameAsBilling ? undefined : shippingAddress || undefined,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '訂單提交失敗');
      // 清除購物車備註
      localStorage.removeItem('cart_notes');
      router.push(`/orders/${data.order.id}?success=1`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '訂單提交失敗，請稍後再試');
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center py-20">
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">結帳</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          <Button onClick={fetchCart}>重新載入</Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center py-20">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 text-lg mb-4">您的購物車是空的</p>
          <Button onClick={() => router.push('/cart')}>返回購物車</Button>
        </div>
      </div>
    );
  }

  const grandTotal = totalAmount; // B2B 不加運費

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <CreditCard className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold">確認訂單</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：訂單摘要 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 商品清單 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4" />
                  商品清單（{items.length} 種）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => {
                  const note = cartNotes[item.id];
                  return (
                    <div key={item.id} className="flex gap-3 py-2 border-b last:border-0">
                      <div className="w-14 h-14 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.product.image
                          ? <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                          : <Package className="w-6 h-6 text-gray-300" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        {item.product.firm && <p className="text-xs text-gray-400">{item.product.firm}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {item.quantity} {item.product.unit || '個'}
                          </Badge>
                          <span className="text-xs text-gray-500">{fmt(item.unitPrice)}/{item.product.unit || '個'}</span>
                          {item.savings > 0 && (
                            <span className="text-xs text-green-600">省 {fmt(item.savings)}</span>
                          )}
                        </div>
                        {note && (
                          <div className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                            <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="truncate">{note}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{fmt(item.subtotal)}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* 聯絡資訊（唯讀，來自帳號） */}
            {user && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4" />
                    採購方資訊
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">公司名稱 / 聯絡人</p>
                    <p className="font-medium">{user.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">統一編號</p>
                    <p className="font-medium">{user.taxId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">電子郵件</p>
                    <p className="font-medium">{user.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">聯絡電話</p>
                    <p className="font-medium">{user.phone || '—'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 收貨地址 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4" />
                  收貨地址
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="same-billing"
                    checked={sameAsBilling}
                    onCheckedChange={(v) => setSameAsBilling(!!v)}
                  />
                  <Label htmlFor="same-billing" className="text-sm cursor-pointer">
                    與帳號登記地址相同
                  </Label>
                </div>
                {!sameAsBilling && (
                  <div>
                    <Label htmlFor="shipping-addr" className="text-sm">收貨地址</Label>
                    <Input
                      id="shipping-addr"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="請輸入收貨地址"
                      className="mt-1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 訂單備註 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">訂單備註</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="如有特殊需求請在此說明（選填）"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </CardContent>
            </Card>
          </div>

          {/* 右：付款 + 合計 */}
          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle>付款方式</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { value: 'ATM', label: 'ATM 轉帳' },
                  { value: 'CREDIT_CARD', label: '信用卡' },
                  { value: 'COD', label: '貨到付款' },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value as typeof paymentMethod)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}

                <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>商品合計</span>
                    <span>{fmt(totalAmount)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>批量折扣</span>
                      <span>- {fmt(totalSavings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>應付金額</span>
                    <span className="text-blue-700">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                >
                  <CreditCard className="w-4 h-4" />
                  {isSubmitting ? '處理中...' : `確認下單 ${fmt(grandTotal)}`}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.back()}>
                  返回修改
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
