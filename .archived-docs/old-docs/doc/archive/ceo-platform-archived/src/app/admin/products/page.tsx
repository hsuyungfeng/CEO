import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteProductDialog } from '@/components/admin/delete-product-dialog'

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: {
        select: {
          name: true,
        },
      },
      firm: {
        select: {
          name: true,
        },
      },
      priceTiers: {
        orderBy: {
          minQty: 'asc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">商品管理</h1>
          <p className="mt-2 text-gray-600">管理所有團購商品</p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新增商品
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>商品列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名稱</TableHead>
                <TableHead>分類</TableHead>
                <TableHead>廠商</TableHead>
                <TableHead>價格</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>已售數量</TableHead>
                <TableHead>建立時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {product.image && (
                        <div className="mr-3 h-10 w-10 rounded overflow-hidden relative">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div>
                        <div>{product.name}</div>
                        {product.subtitle && (
                          <div className="text-sm text-gray-500">{product.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{product.category?.name || '未分類'}</TableCell>
                  <TableCell>{product.firm?.name || '未設定'}</TableCell>
                  <TableCell>
                    {product.priceTiers.length > 0 ? (
                      <div>
                        <div className="font-medium">
                          NT$ {product.priceTiers[0].price.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          起批量: {product.priceTiers[0].minQty}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={product.isActive ? 'default' : 'secondary'}
                        className="w-fit"
                      >
                        {product.isActive ? '上架中' : '已下架'}
                      </Badge>
                      {product.isFeatured && (
                        <Badge variant="outline" className="w-fit">
                          熱門商品
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.totalSold}</TableCell>
                  <TableCell>
                    {new Date(product.createdAt).toLocaleDateString('zh-TW')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${product.id}`} target="_blank">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/products/${product.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                       <DeleteProductDialog
                         productId={product.id}
                         productName={product.name}
                       />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
