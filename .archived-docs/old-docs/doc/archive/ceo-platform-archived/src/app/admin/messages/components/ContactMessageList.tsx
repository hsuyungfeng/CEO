'use client';

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
import { Eye, Trash2, Search, ChevronLeft, ChevronRight, Loader2, Mail, MailOpen, Calendar } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  isRead: boolean
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

interface Stats {
  total: number
  unread: number
  read: number
}

export default function ContactMessageList() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [stats, setStats] = useState<Stats>({ total: 0, unread: 0, read: 0 })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }

      if (statusFilter !== 'all') {
        params.append('isRead', statusFilter === 'read' ? 'true' : 'false')
      }

      const response = await fetch(`/api/admin/contact-messages?${params}`)
      const result = await response.json()

      if (result.success) {
        setMessages(result.data.messages)
        setPagination(result.data.pagination)
        setStats(result.data.stats)
      } else {
        setError(result.error || '載入聯絡訊息失敗')
        toast.error(result.error || '載入聯絡訊息失敗')
      }
    } catch (err) {
      setError('網絡錯誤，請稍後再試')
      toast.error('網絡錯誤，請稍後再試')
      console.error('載入聯絡訊息錯誤:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/contact-messages/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('聯絡訊息刪除成功')
        fetchMessages() // 重新載入列表
      } else {
        toast.error(result.error || '刪除失敗')
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試')
      console.error('刪除聯絡訊息錯誤:', error)
    } finally {
      setDeletingId(null)
      setShowDeleteDialog(false)
      setMessageToDelete(null)
    }
  }

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/admin/contact-messages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(isRead ? '已標記為已讀' : '已標記為未讀')
        fetchMessages() // 重新載入列表
      } else {
        toast.error(result.error || '操作失敗')
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試')
      console.error('標記已讀錯誤:', error)
    }
  }

  const confirmDelete = (id: string) => {
    setMessageToDelete(id)
    setShowDeleteDialog(true)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page }))
  }

  const handleLimitChange = (newLimit: string) => {
    const limit = parseInt(newLimit, 10)
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading && messages.length === 0) {
    return <div className="py-8 text-center">載入中...</div>
  }

  if (error && messages.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-red-600 mb-2">載入失敗</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <Button onClick={fetchMessages}>重試</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
            <Input
              placeholder="搜尋姓名、Email、電話、主題或訊息..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={(value: 'all' | 'read' | 'unread') => setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="篩選狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="unread">未讀訊息</SelectItem>
              <SelectItem value="read">已讀訊息</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">總訊息數</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">未讀訊息</p>
              <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center">
            <MailOpen className="mr-2 h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">已讀訊息</p>
              <p className="text-2xl font-bold text-green-600">{stats.read}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>狀態</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>主題</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  提交時間
                </div>
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                  沒有找到聯絡訊息
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                <TableRow key={message.id} className={!message.isRead ? 'bg-blue-50' : ''}>
                  <TableCell>
                    <Badge variant={message.isRead ? "default" : "secondary"}>
                      {message.isRead ? '已讀' : '未讀'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{message.name}</TableCell>
                  <TableCell>
                    <a href={`mailto:${message.email}`} className="text-blue-600 hover:underline">
                      {message.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    {message.phone ? (
                      <a href={`tel:${message.phone}`} className="text-blue-600 hover:underline">
                        {message.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400">未提供</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {message.subject || <span className="text-gray-400">無主題</span>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {formatDate(message.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/messages/${message.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsRead(message.id, !message.isRead)}
                        disabled={deletingId === message.id}
                      >
                        {message.isRead ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MailOpen className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(message.id)}
                        disabled={deletingId === message.id}
                      >
                        {deletingId === message.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分頁控制 */}
      {messages.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-sm text-gray-600">
            顯示第 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} 筆，共 {pagination.total} 筆
          </div>
          
          <div className="flex items-center gap-4">
            <Select
              value={pagination.limit.toString()}
              onValueChange={handleLimitChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="每頁筆數" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 筆</SelectItem>
                <SelectItem value="20">20 筆</SelectItem>
                <SelectItem value="50">50 筆</SelectItem>
                <SelectItem value="100">100 筆</SelectItem>
              </SelectContent>
            </Select>

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
                第 {pagination.page} / {pagination.totalPages} 頁
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
          </div>
        </div>
      )}

      {/* 刪除確認對話框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將永久刪除此聯絡訊息，刪除後無法恢復。確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => messageToDelete && handleDelete(messageToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}