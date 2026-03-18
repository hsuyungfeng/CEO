'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  Calendar,
  Package,
  Loader2,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  image: string | null
  isActive: boolean
  createdAt: string
}

interface Firm {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  products: Product[]
  _count: {
    products: number
  }
}

interface EditForm {
  name: string
  phone: string
  address: string
  isActive: boolean
}

export default function FirmDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [firm, setFirm] = useState<Firm | null>(null)
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsPage, setProductsPage] = useState(1)
  const [hasMoreProducts, setHasMoreProducts] = useState(true)

  // 編輯對話框狀態
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    phone: '',
    address: '',
    isActive: true,
  })
  const [editing, setEditing] = useState(false)

  // 獲取廠商詳情
  const fetchFirmDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/firms/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('廠商不存在')
          router.push('/admin/firms')
          return
        }
        throw new Error('獲取廠商詳情失敗')
      }
      
      const data = await response.json()
      setFirm(data)
      setEditForm({
        name: data.name,
        phone: data.phone || '',
        address: data.address || '',
        isActive: data.isActive,
      })
    } catch (error) {
      console.error('獲取廠商詳情錯誤:', error)
      toast.error('獲取廠商詳情失敗')
      router.push('/admin/firms')
    } finally {
      setLoading(false)
    }
  }

  // 獲取廠商商品
  const fetchFirmProducts = async (page = 1) => {
    try {
      setProductsLoading(true)
      const response = await fetch(
        `/api/admin/products?firmId=${params.id}&page=${page}&limit=10`
      )
      
      if (!response.ok) {
        throw new Error('獲取商品列表失敗')
      }
      
      const data = await response.json()
      
      if (page === 1) {
        setProducts(data.products)
      } else {
        setProducts(prev => [...prev, ...data.products])
      }
      
      setHasMoreProducts(data.products.length === 10)
      setProductsPage(page)
    } catch (error) {
      console.error('獲取商品列表錯誤:', error)
      toast.error('獲取商品列表失敗')
    } finally {
      setProductsLoading(false)
    }
  }

  // 載入更多商品
  const loadMoreProducts = () => {
    fetchFirmProducts(productsPage + 1)
  }

  // 更新廠商
  const handleUpdateFirm = async () => {
    if (!firm || !editForm.name.trim()) {
      toast.error('請輸入廠商名稱')
      return
    }

    try {
      setEditing(true)
      
      const response = await fetch(`/api/admin/firms/${firm.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          address: editForm.address.trim() || null,
          isActive: editForm.isActive,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新廠商失敗')
      }

      const updatedFirm = await response.json()
      setFirm(updatedFirm)
      
      toast.success('廠商更新成功')
      setIsEditDialogOpen(false)
      
    } catch (error: any) {
      console.error('更新廠商錯誤:', error)
      toast.error(error.message || '更新廠商失敗')
    } finally {
      setEditing(false)
    }
  }

  // 初始載入
  useEffect(() => {
    if (params.id) {
      fetchFirmDetail()
      fetchFirmProducts(1)
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!firm) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">廠商不存在</p>
        <Button variant="link" onClick={() => router.push('/admin/firms')}>
          返回廠商列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/firms')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{firm.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={firm.isActive ? 'default' : 'secondary'}>
                {firm.isActive ? '已啟用' : '已停用'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                建立於 {new Date(firm.createdAt).toLocaleDateString('zh-TW')}
              </span>
            </div>
          </div>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              編輯廠商
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯廠商</DialogTitle>
              <DialogDescription>
                修改廠商基本資訊
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">廠商名稱 *</Label>
                <Input
                  id="edit-name"
                  placeholder="輸入廠商名稱"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">聯絡電話</Label>
                <Input
                  id="edit-phone"
                  placeholder="輸入聯絡電話"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">地址</Label>
                <Textarea
                  id="edit-address"
                  placeholder="輸入廠商地址"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">啟用狀態</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdateFirm} disabled={editing}>
                {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 廠商基本資訊 */}
        <Card>
          <CardHeader>
            <CardTitle>基本資訊</CardTitle>
            <CardDescription>廠商聯絡資訊和狀態</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">聯絡電話：</span>
                <span>{firm.phone || '未提供'}</span>
              </div>
              {firm.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium">地址：</span>
                    <p className="text-muted-foreground">{firm.address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">建立時間：</span>
                <span>{new Date(firm.createdAt).toLocaleString('zh-TW')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">商品數量：</span>
                <Badge variant="outline">{firm._count.products} 個</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 統計資訊 */}
        <Card>
          <CardHeader>
            <CardTitle>統計資訊</CardTitle>
            <CardDescription>廠商相關數據統計</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">總商品數</p>
                  <p className="text-2xl font-bold">{firm._count.products}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">啟用商品</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.isActive).length}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">狀態分佈</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">已啟用商品</span>
                    <Badge variant="default">
                      {products.filter(p => p.isActive).length} 個
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">已停用商品</span>
                    <Badge variant="secondary">
                      {products.filter(p => !p.isActive).length} 個
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 廠商商品列表 */}
      <Card>
        <CardHeader>
          <CardTitle>關聯商品</CardTitle>
          <CardDescription>
            此廠商的所有商品列表，共 {firm._count.products} 個商品
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading && products.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              此廠商暫無商品
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品名稱</TableHead>
                      <TableHead>圖片</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>建立時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          {product.image ? (
                            <div className="h-10 w-10 rounded-md border overflow-hidden relative">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-md border flex items-center justify-center text-muted-foreground">
                              無圖
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? 'default' : 'secondary'}>
                            {product.isActive ? '已啟用' : '已停用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(product.createdAt).toLocaleDateString('zh-TW')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link href={`/admin/products/${product.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {hasMoreProducts && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={loadMoreProducts}
                    disabled={productsLoading}
                  >
                    {productsLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    載入更多商品
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
