'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Firm {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  _count: {
    products: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function FirmsPage() {
  const router = useRouter()
  const [firms, setFirms] = useState<Firm[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined)
  const [sortBy, setSortBy] = useState('createdAt')
  const [order, setOrder] = useState('desc')

  // 新增廠商對話框狀態
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newFirm, setNewFirm] = useState({
    name: '',
    phone: '',
    address: '',
    isActive: true,
  })
  const [adding, setAdding] = useState(false)

  // 編輯廠商對話框狀態
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    isActive: true,
  })
  const [editing, setEditing] = useState(false)

  // 刪除確認對話框狀態
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingFirm, setDeletingFirm] = useState<Firm | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 獲取廠商列表
  const fetchFirms = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        order,
      })
      
      if (search) params.append('search', search)
      if (isActive !== undefined) params.append('isActive', isActive.toString())
      
      const response = await fetch(`/api/admin/firms?${params}`)
      
      if (!response.ok) {
        throw new Error('獲取廠商列表失敗')
      }
      
      const data = await response.json()
      setFirms(data.firms)
      setPagination(data.pagination)
    } catch (error) {
      console.error('獲取廠商列表錯誤:', error)
      toast.error('獲取廠商列表失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始載入和參數變化時重新獲取
  useEffect(() => {
    fetchFirms()
  }, [pagination.page, search, isActive, sortBy, order])

  // 新增廠商
  const handleAddFirm = async () => {
    if (!newFirm.name.trim()) {
      toast.error('請輸入廠商名稱')
      return
    }

    try {
      setAdding(true)
      
      const response = await fetch('/api/admin/firms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFirm.name.trim(),
          phone: newFirm.phone.trim() || null,
          address: newFirm.address.trim() || null,
          isActive: newFirm.isActive,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '新增廠商失敗')
      }

      const firm = await response.json()
      
      toast.success('廠商新增成功')
      setIsAddDialogOpen(false)
      setNewFirm({
        name: '',
        phone: '',
        address: '',
        isActive: true,
      })
      
      // 重新載入列表
      fetchFirms()
      
    } catch (error: any) {
      console.error('新增廠商錯誤:', error)
      toast.error(error.message || '新增廠商失敗')
    } finally {
      setAdding(false)
    }
  }

  // 編輯廠商
  const handleEditFirm = async () => {
    if (!editingFirm || !editForm.name.trim()) {
      toast.error('請輸入廠商名稱')
      return
    }

    try {
      setEditing(true)
      
      const response = await fetch(`/api/admin/firms/${editingFirm.id}`, {
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
      
      toast.success('廠商更新成功')
      setIsEditDialogOpen(false)
      setEditingFirm(null)
      
      // 更新列表
      setFirms(firms.map(firm => 
        firm.id === updatedFirm.id ? updatedFirm : firm
      ))
      
    } catch (error: any) {
      console.error('更新廠商錯誤:', error)
      toast.error(error.message || '更新廠商失敗')
    } finally {
      setEditing(false)
    }
  }

  // 刪除廠商
  const handleDeleteFirm = async () => {
    if (!deletingFirm) return

    try {
      setDeleting(true)
      
      const response = await fetch(`/api/admin/firms/${deletingFirm.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '刪除廠商失敗')
      }

      toast.success('廠商刪除成功')
      setIsDeleteDialogOpen(false)
      setDeletingFirm(null)
      
      // 重新載入列表
      fetchFirms()
      
    } catch (error: any) {
      console.error('刪除廠商錯誤:', error)
      toast.error(error.message || '刪除廠商失敗')
    } finally {
      setDeleting(false)
    }
  }

  // 開啟編輯對話框
  const openEditDialog = (firm: Firm) => {
    setEditingFirm(firm)
    setEditForm({
      name: firm.name,
      phone: firm.phone || '',
      address: firm.address || '',
      isActive: firm.isActive,
    })
    setIsEditDialogOpen(true)
  }

  // 開啟刪除對話框
  const openDeleteDialog = (firm: Firm) => {
    setDeletingFirm(firm)
    setIsDeleteDialogOpen(true)
  }

  // 查看廠商詳情
  const viewFirmDetail = (id: string) => {
    router.push(`/admin/firms/${id}`)
  }

  // 分頁控制
  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">廠商管理</h1>
          <p className="text-muted-foreground">
            管理商品廠商資訊，共 {pagination.total} 個廠商
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新增廠商
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增廠商</DialogTitle>
              <DialogDescription>
                填寫廠商基本資訊，所有欄位皆為必填。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">廠商名稱 *</Label>
                <Input
                  id="name"
                  placeholder="輸入廠商名稱"
                  value={newFirm.name}
                  onChange={(e) => setNewFirm({ ...newFirm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">聯絡電話</Label>
                <Input
                  id="phone"
                  placeholder="輸入聯絡電話"
                  value={newFirm.phone}
                  onChange={(e) => setNewFirm({ ...newFirm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Textarea
                  id="address"
                  placeholder="輸入廠商地址"
                  value={newFirm.address}
                  onChange={(e) => setNewFirm({ ...newFirm, address: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newFirm.isActive}
                  onCheckedChange={(checked) => setNewFirm({ ...newFirm, isActive: checked })}
                />
                <Label htmlFor="isActive">啟用狀態</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddFirm} disabled={adding}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                新增
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>廠商列表</CardTitle>
          <CardDescription>
            使用搜尋和篩選功能快速找到需要的廠商
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 搜尋和篩選 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜尋廠商名稱、電話或地址..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={isActive === undefined ? 'all' : isActive.toString()}
                  onValueChange={(value) => {
                    if (value === 'all') setIsActive(undefined)
                    else setIsActive(value === 'true')
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部狀態</SelectItem>
                    <SelectItem value="true">已啟用</SelectItem>
                    <SelectItem value="false">已停用</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="排序" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">名稱</SelectItem>
                    <SelectItem value="createdAt">建立時間</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={order} onValueChange={setOrder}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="順序" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">降序</SelectItem>
                    <SelectItem value="asc">升序</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 廠商表格 */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : firms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暫無廠商資料
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>廠商名稱</TableHead>
                        <TableHead>聯絡電話</TableHead>
                        <TableHead>商品數量</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>建立時間</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {firms.map((firm) => (
                        <TableRow key={firm.id}>
                          <TableCell className="font-medium">
                            {firm.name}
                            {firm.address && (
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {firm.address}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{firm.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {firm._count.products} 個
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={firm.isActive ? 'default' : 'secondary'}>
                              {firm.isActive ? '已啟用' : '已停用'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(firm.createdAt).toLocaleDateString('zh-TW')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => viewFirmDetail(firm.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(firm)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(firm)}
                                disabled={firm._count.products > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分頁控制 */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      第 {pagination.page} 頁，共 {pagination.totalPages} 頁，
                      共 {pagination.total} 筆資料
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-sm">
                        {pagination.page} / {pagination.totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 編輯廠商對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯廠商</DialogTitle>
            <DialogDescription>
              修改廠商基本資訊
            </DialogDescription>
          </DialogHeader>
          {editingFirm && (
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditFirm} disabled={editing}>
              {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              確定要刪除廠商「{deletingFirm?.name}」嗎？此操作無法復原。
              {deletingFirm && deletingFirm._count.products > 0 && (
                <div className="mt-2 text-red-500">
                  注意：此廠商有 {deletingFirm._count.products} 個關聯商品，
                  請先移除或轉移這些商品後再刪除廠商。
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFirm}
              disabled={deleting || (deletingFirm?._count.products || 0) > 0}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}