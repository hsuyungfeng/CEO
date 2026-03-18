'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Edit, Trash2, ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface Faq {
  id: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export default function FaqList() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'sortOrder' | 'createdAt' | 'question'>('sortOrder')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  useEffect(() => {
    fetchFaqs()
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter])

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false')
      }
      
      const response = await fetch(`/api/admin/faqs?${params}`)
      if (!response.ok) {
        throw new Error('獲取 FAQ 列表失敗')
      }
      
      const data = await response.json()
      if (data.success) {
        setFaqs(data.data)
        setPagination(data.pagination)
      } else {
        throw new Error(data.error || '獲取 FAQ 列表失敗')
      }
    } catch (error) {
      console.error('Failed to fetch FAQs:', error)
      const errorMessage = error instanceof Error ? error.message : '獲取 FAQ 列表失敗'
      setError(errorMessage)
      toast.error('獲取 FAQ 列表失敗', {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter])

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '刪除 FAQ 失敗')
      }
      
      const data = await response.json()
      if (data.success) {
        toast.success('FAQ 刪除成功')
        fetchFaqs()
        setDeleteDialogOpen(false)
        setFaqToDelete(null)
      } else {
        throw new Error(data.error || '刪除 FAQ 失敗')
      }
    } catch (error) {
      console.error('Failed to delete FAQ:', error)
      const errorMessage = error instanceof Error ? error.message : '刪除 FAQ 失敗'
      toast.error('刪除失敗', {
        description: errorMessage,
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? '停用' : '啟用'
    const confirmMessage = currentStatus 
      ? `確定要停用這個 FAQ 嗎？停用後用戶將無法看到此 FAQ。`
      : `確定要啟用這個 FAQ 嗎？`
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    try {
      setTogglingId(id)
      const response = await fetch(`/api/admin/faqs/${id}/toggle-status`, {
        method: 'PATCH',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `${action} FAQ 失敗`)
      }
      
      const data = await response.json()
      if (data.success) {
        toast.success(`FAQ ${action}成功`)
        fetchFaqs()
      } else {
        throw new Error(data.error || `${action} FAQ 失敗`)
      }
    } catch (error) {
      console.error('Failed to toggle FAQ status:', error)
      const errorMessage = error instanceof Error ? error.message : `${action} FAQ 失敗`
      toast.error(`${action}失敗`, {
        description: errorMessage,
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleSort = (column: 'sortOrder' | 'createdAt' | 'question') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page }))
  }

  const handleLimitChange = (newLimit: string) => {
    const limit = parseInt(newLimit, 10)
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }

  const sortedFaqs = [...faqs].sort((a, b) => {
    if (sortBy === 'sortOrder') {
      return sortOrder === 'asc' ? a.sortOrder - b.sortOrder : b.sortOrder - a.sortOrder
    } else if (sortBy === 'question') {
      return sortOrder === 'asc' 
        ? a.question.localeCompare(b.question)
        : b.question.localeCompare(a.question)
    } else {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    }
  })

  if (loading && faqs.length === 0) {
    return <div className="py-8 text-center">載入中...</div>
  }

  if (error && faqs.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-red-600 mb-2">載入失敗</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <Button onClick={fetchFaqs}>重試</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
         <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
           {loading && (
             <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
           )}
           <Input
             placeholder="搜尋問題或答案..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pl-9"
           />
         </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="篩選狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="active">啟用中</SelectItem>
              <SelectItem value="inactive">已停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <button
                  onClick={() => handleSort('sortOrder')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  排序
                  {sortBy === 'sortOrder' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('question')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  問題
                  {sortBy === 'question' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  建立時間
                  {sortBy === 'createdAt' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFaqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                  沒有找到 FAQ
                </TableCell>
              </TableRow>
            ) : (
              sortedFaqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell className="font-medium">{faq.sortOrder}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="font-medium">{faq.question}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={faq.isActive ? 'default' : 'secondary'}>
                      {faq.isActive ? '啟用中' : '已停用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(faq.createdAt).toLocaleDateString('zh-TW')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/faqs/${faq.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => handleToggleStatus(faq.id, faq.isActive)}
                         disabled={togglingId === faq.id}
                       >
                         {togglingId === faq.id ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : faq.isActive ? (
                           <span className="text-red-600">停用</span>
                         ) : (
                           <span className="text-green-600">啟用</span>
                         )}
                       </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFaqToDelete(faq.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.total > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            顯示第 {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} 筆，
            共 {pagination.total.toLocaleString()} 筆
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">顯示</span>
              <Select value={pagination.limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="筆數" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 筆</SelectItem>
                  <SelectItem value="20">20 筆</SelectItem>
                  <SelectItem value="50">50 筆</SelectItem>
                  <SelectItem value="100">100 筆</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">/頁</span>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm">
                  第 {pagination.page} 頁，共 {pagination.totalPages} 頁
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除這個 FAQ 嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel disabled={deletingId === faqToDelete}>取消</AlertDialogCancel>
             <AlertDialogAction
               onClick={() => faqToDelete && handleDelete(faqToDelete)}
               disabled={deletingId === faqToDelete}
               className="bg-red-600 hover:bg-red-700"
             >
               {deletingId === faqToDelete ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   刪除中...
                 </>
               ) : (
                 '刪除'
               )}
             </AlertDialogAction>
           </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}