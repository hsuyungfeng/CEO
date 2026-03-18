import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, User, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import OrderStatusUpdate from '@/components/admin/order-status-update'

interface OrderDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: {
      id: id,
    },
    include: {
      user: {
        select: {
          name: true,
          taxId: true,
          email: true,
          phone: true,
          address: true,
          contactPerson: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
              unit: true,
              spec: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    notFound()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">待處理</Badge>
      case 'CONFIRMED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">已確認</Badge>
      case 'SHIPPED':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">已出貨</Badge>
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">已完成</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">已取消</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">訂單詳情</h1>
            <p className="mt-2 text-gray-600">訂單編號: {order.orderNo}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* 訂單資訊 */}
          <Card>
            <CardHeader>
              <CardTitle>訂單資訊</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="mr-2 h-4 w-4" />
                    建立時間
                  </div>
                  <div className="font-medium">
                    {new Date(order.createdAt).toLocaleString('zh-TW')}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign className="mr-2 h-4 w-4" />
                    總金額
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    NT$ {order.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 商品明細 */}
          <Card>
            <CardHeader>
              <CardTitle>商品明細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.product.spec} • {item.product.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {item.quantity} × NT$ {item.unitPrice.toFixed(2)}
                      </div>
                      <div className="text-lg font-bold">
                        NT$ {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <div>總計</div>
                  <div>NT$ {order.totalAmount.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 備註 */}
          {order.note && (
            <Card>
              <CardHeader>
                <CardTitle>訂單備註</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-gray-700">{order.note}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* 狀態管理 */}
          <Card>
            <CardHeader>
              <CardTitle>狀態管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">目前狀態</div>
                  {getStatusBadge(order.status)}
                </div>
                <OrderStatusUpdate orderId={order.id} currentStatus={order.status} />
              </div>
            </CardContent>
          </Card>

          {/* 會員資訊 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                會員資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">公司名稱</div>
                <div className="font-medium">{order.user.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">統一編號</div>
                <div className="font-medium">{order.user.taxId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">聯絡人</div>
                <div className="font-medium">{order.user.contactPerson || '未設定'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">電話</div>
                <div className="font-medium">{order.user.phone || '未設定'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">地址</div>
                <div className="font-medium">{order.user.address || '未設定'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium">{order.user.email}</div>
              </div>
            </CardContent>
          </Card>

          {/* 紅利點數 */}
          <Card>
            <CardHeader>
              <CardTitle>紅利點數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {order.pointsEarned}
                </div>
                <div className="text-sm text-gray-500 mt-2">本次訂單獲得點數</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}