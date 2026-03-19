'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface SupplierProduct {
  id: string
  name: string
  SKU: string | null
  description: string | null
  category: string | null
  unit: string | null
  imageUrl: string | null
  price: number
  moq: number
  stock: number
  isActive: boolean
  createdAt: string
}

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    SKU: '',
    description: '',
    category: '',
    unit: '',
    imageUrl: '',
    price: '',
    moq: '1',
    stock: '0',
    length: '',
    width: '',
    height: '',
    weight: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    SKU: '',
    description: '',
    category: '',
    unit: '',
    imageUrl: '',
    price: '',
    moq: '',
    stock: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    isActive: true,
  })

  useEffect(() => {
    fetchProducts()
  }, [search, page])

  async function fetchProducts() {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' })
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/supplier/products?${params}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.data)
        setTotalPages(data.pagination?.totalPages ?? 1)
      } else {
        setError(data.error || '載入失敗')
      }
    } catch {
      setError('載入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/supplier/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          SKU: formData.SKU || undefined,
          description: formData.description || undefined,
          category: formData.category || undefined,
          unit: formData.unit || undefined,
          imageUrl: formData.imageUrl || undefined,
          price: parseFloat(formData.price),
          moq: parseInt(formData.moq) || 1,
          stock: parseInt(formData.stock) || 0,
          length: formData.length ? parseFloat(formData.length) : undefined,
          width: formData.width ? parseFloat(formData.width) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setShowAddDialog(false)
        setFormData({
          name: '',
          SKU: '',
          description: '',
          category: '',
          unit: '',
          imageUrl: '',
          price: '',
          moq: '1',
          stock: '0',
          length: '',
          width: '',
          height: '',
          weight: '',
        })
        fetchProducts()
      } else {
        alert(data.error || '建立失敗')
      }
    } catch {
      alert('建立失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除此產品嗎？')) return

    try {
      const res = await fetch(`/api/supplier/products/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        fetchProducts()
      } else {
        alert(data.error || '刪除失敗')
      }
    } catch {
      alert('刪除失敗')
    }
  }

  function handleEdit(product: SupplierProduct) {
    setEditingProduct(product)
    setEditFormData({
      name: product.name,
      SKU: product.SKU || '',
      description: product.description || '',
      category: product.category || '',
      unit: product.unit || '',
      imageUrl: product.imageUrl || '',
      price: product.price.toString(),
      moq: product.moq.toString(),
      stock: product.stock.toString(),
      length: '',
      width: '',
      height: '',
      weight: '',
      isActive: product.isActive,
    })
    setShowEditDialog(true)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    
    if (!editingProduct) return
    
    try {
      const res = await fetch(`/api/supplier/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          SKU: editFormData.SKU || undefined,
          description: editFormData.description || undefined,
          category: editFormData.category || undefined,
          unit: editFormData.unit || undefined,
          imageUrl: editFormData.imageUrl || undefined,
          price: parseFloat(editFormData.price) || 0,
          moq: parseInt(editFormData.moq) || 1,
          stock: parseInt(editFormData.stock) || 0,
          length: editFormData.length ? parseFloat(editFormData.length) : undefined,
          width: editFormData.width ? parseFloat(editFormData.width) : undefined,
          height: editFormData.height ? parseFloat(editFormData.height) : undefined,
          weight: editFormData.weight ? parseFloat(editFormData.weight) : undefined,
          isActive: editFormData.isActive,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setShowEditDialog(false)
        setEditingProduct(null)
        fetchProducts()
      } else {
        alert(data.error || '更新失敗')
      }
    } catch {
      alert('更新失敗')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">{error}</p>
              <Link href="/suppliers/register">
                <Button>註冊供應商</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">產品管理</h1>
            <p className="text-gray-500">管理供應商產品列表</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>新增產品</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>新增產品</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">產品名稱 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="SKU">SKU</Label>
                    <Input
                      id="SKU"
                      value={formData.SKU}
                      onChange={(e) => setFormData({ ...formData, SKU: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">分類</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">產品描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="產品說明..."
                  />
                </div>
                <div>
                  <Label htmlFor="imageUrl">圖片網址</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">價格 (NT$) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">單位</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="如：箱、盒、個"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="moq">最小訂購量</Label>
                    <Input
                      id="moq"
                      type="number"
                      value={formData.moq}
                      onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">庫存</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 font-medium">尺寸資訊（cm）</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="length">長</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.01"
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="width">寬</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.01"
                      value={formData.width}
                      onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">高</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.01"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="weight">重量（kg）</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.001"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">建立產品</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>編輯產品</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">產品名稱 *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-SKU">SKU</Label>
                    <Input
                      id="edit-SKU"
                      value={editFormData.SKU}
                      onChange={(e) => setEditFormData({ ...editFormData, SKU: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">分類</Label>
                    <Input
                      id="edit-category"
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-description">產品描述</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={2}
                    placeholder="產品說明..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-imageUrl">圖片網址</Label>
                  <Input
                    id="edit-imageUrl"
                    value={editFormData.imageUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-price">價格 (NT$) *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-unit">單位</Label>
                    <Input
                      id="edit-unit"
                      value={editFormData.unit}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                      placeholder="如：箱、盒、個"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-moq">最小訂購量</Label>
                    <Input
                      id="edit-moq"
                      type="number"
                      value={editFormData.moq}
                      onChange={(e) => setEditFormData({ ...editFormData, moq: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-stock">庫存</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      value={editFormData.stock}
                      onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 font-medium">尺寸資訊（cm）</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-length">長</Label>
                    <Input
                      id="edit-length"
                      type="number"
                      step="0.01"
                      value={editFormData.length}
                      onChange={(e) => setEditFormData({ ...editFormData, length: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-width">寬</Label>
                    <Input
                      id="edit-width"
                      type="number"
                      step="0.01"
                      value={editFormData.width}
                      onChange={(e) => setEditFormData({ ...editFormData, width: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-height">高</Label>
                    <Input
                      id="edit-height"
                      type="number"
                      step="0.01"
                      value={editFormData.height}
                      onChange={(e) => setEditFormData({ ...editFormData, height: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-weight">重量（kg）</Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.001"
                    value={editFormData.weight}
                    onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-isActive" className="mb-0">上架中</Label>
                </div>
                <Button type="submit" className="w-full">更新產品</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>產品列表</CardTitle>
              <Input
                placeholder="搜尋產品..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>產品名稱</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>價格</TableHead>
                  <TableHead>MOQ</TableHead>
                  <TableHead>庫存</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      尚無產品
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.SKU || '-'}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>NT$ {product.price.toLocaleString()}</TableCell>
                      <TableCell>{product.moq}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? '上架中' : '已下架'}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         <div className="flex gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleEdit(product)}
                           >
                             編輯
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleDelete(product.id)}
                           >
                             刪除
                           </Button>
                         </div>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一頁
                </Button>
                <span className="flex items-center px-4">
                  第 {page} / {totalPages} 頁
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一頁
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
