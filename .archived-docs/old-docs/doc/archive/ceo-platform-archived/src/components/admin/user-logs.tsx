'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, User, Calendar, FileText, RefreshCw } from 'lucide-react'


interface UserLog {
  id: string
  action: string
  oldValue: string | null
  newValue: string | null
  reason: string | null
  metadata: any
  createdAt: string
  admin: {
    id: string
    name: string
    email: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface UserLogsProps {
  memberId: string
}

export default function UserLogs({ memberId }: UserLogsProps) {
  const [logs, setLogs] = useState<UserLog[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string>('')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const fetchLogs = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(action && { action }),
      })

      const response = await fetch(`/api/admin/users/${memberId}/logs?${params}`)
      const result = await response.json()

      if (result.success) {
        setLogs(result.data)
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error('取得操作日誌錯誤:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [action])

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'STATUS_CHANGE':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">狀態變更</Badge>
      case 'POINTS_ADJUST':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">點數調整</Badge>
      case 'INFO_UPDATE':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">資訊更新</Badge>
      case 'ACCOUNT_LOCK':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">帳號鎖定</Badge>
      case 'ACCOUNT_UNLOCK':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">帳號解鎖</Badge>
      default:
        return <Badge variant="outline">未知操作</Badge>
    }
  }

  const getActionDescription = (log: UserLog) => {
    switch (log.action) {
      case 'STATUS_CHANGE':
        return `狀態從 ${log.oldValue || '未知'} 變更為 ${log.newValue || '未知'}`
      case 'POINTS_ADJUST':
        const metadata = log.metadata || {}
        const amount = metadata.amount || 0
        const type = metadata.adjustmentType || 'ADD'
        return `${type === 'ADD' ? '增加' : type === 'SUBTRACT' ? '減少' : '設定'} ${Math.abs(amount)} 點`
      case 'INFO_UPDATE':
        return '更新會員資訊'
      case 'ACCOUNT_LOCK':
        return '鎖定會員帳號'
      case 'ACCOUNT_UNLOCK':
        return '解鎖會員帳號'
      default:
        return '未知操作'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage)
  }

  const handleRefresh = () => {
    fetchLogs(pagination.page)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>操作日誌</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-48">
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="篩選操作類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部操作</SelectItem>
                  <SelectItem value="STATUS_CHANGE">狀態變更</SelectItem>
                  <SelectItem value="POINTS_ADJUST">點數調整</SelectItem>
                  <SelectItem value="INFO_UPDATE">資訊更新</SelectItem>
                  <SelectItem value="ACCOUNT_LOCK">帳號鎖定</SelectItem>
                  <SelectItem value="ACCOUNT_UNLOCK">帳號解鎖</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">沒有操作記錄</h3>
            <p className="mt-2 text-sm text-gray-500">
              此會員尚未有任何操作記錄
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {getActionBadge(log.action)}
                        <div className="text-sm font-medium">
                          {getActionDescription(log)}
                        </div>
                      </div>
                      
                      {log.reason && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">原因：</span>
                          {log.reason}
                        </div>
                      )}

                      <div className="flex items-center text-sm text-gray-500">
                        <User className="mr-2 h-3 w-3" />
                        <span className="font-medium">{log.admin.name}</span>
                        <span className="mx-2">•</span>
                        <span>{log.admin.email}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="mr-2 h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </div>
                    </div>

                    {/* 詳細資訊 */}
                    {(log.oldValue || log.newValue) && (
                      <div className="text-sm text-gray-600">
                        {log.oldValue && (
                          <div className="mb-1">
                            <span className="font-medium">原值：</span>
                            <span className="bg-gray-100 px-2 py-1 rounded">{log.oldValue}</span>
                          </div>
                        )}
                        {log.newValue && (
                          <div>
                            <span className="font-medium">新值：</span>
                            <span className="bg-gray-100 px-2 py-1 rounded">{log.newValue}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 分頁 */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  顯示第 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} 筆，
                  共 {pagination.total.toLocaleString()} 筆
                </div>
                <div className="flex items-center space-x-2">
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
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}