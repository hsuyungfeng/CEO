'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Mail, Phone, MapPin, Search, Filter, ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'


interface Member {
  id: string
  name: string
  taxId: string
  email: string
  phone: string | null
  address: string | null
  contactPerson: string | null
  points: number
  role: string
  status: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  orderCount: number
  recentOrders: Array<{
    id: string
    orderNo: string
    totalAmount: number
    status: string
    createdAt: string
  }>
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const fetchMembers = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(status && { status }),
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const result = await response.json()

      if (result.success) {
        setMembers(result.data)
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error('取得會員列表錯誤:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [search, status, sortBy, sortOrder])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">啟用中</Badge>
      case 'INACTIVE':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">未啟用</Badge>
      case 'SUSPENDED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">已停權</Badge>
      case 'DELETED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">已刪除</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const handlePageChange = (newPage: number) => {
    fetchMembers(newPage)
  }

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">會員管理</h1>
        <p className="mt-2 text-gray-600">管理所有企業會員</p>
      </div>

      {/* 搜尋和篩選 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">搜尋</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="搜尋公司名稱、統一編號、Email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">狀態篩選</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="全部狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部狀態</SelectItem>
                  <SelectItem value="ACTIVE">啟用中</SelectItem>
                  <SelectItem value="INACTIVE">未啟用</SelectItem>
                  <SelectItem value="SUSPENDED">已停權</SelectItem>
                  <SelectItem value="DELETED">已刪除</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sortBy">排序方式</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">註冊時間</SelectItem>
                  <SelectItem value="name">公司名稱</SelectItem>
                  <SelectItem value="points">紅利點數</SelectItem>
                  <SelectItem value="updatedAt">最後更新</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => fetchMembers()} className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                篩選
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>會員列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-[250px] bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-[200px] bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">沒有找到會員</h3>
              <p className="mt-2 text-sm text-gray-500">
                嘗試調整搜尋條件或篩選條件
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSortChange('name')}>
                        <div className="flex items-center">
                          公司名稱
                          {sortBy === 'name' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead>統一編號</TableHead>
                      <TableHead>聯絡資訊</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSortChange('points')}>
                        <div className="flex items-center">
                          紅利點數
                          {sortBy === 'points' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSortChange('createdAt')}>
                        <div className="flex items-center">
                          註冊時間
                          {sortBy === 'createdAt' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4 text-gray-400" />
                              {member.name}
                            </div>
                            {member.contactPerson && (
                              <div className="text-sm text-gray-500 mt-1">聯絡人: {member.contactPerson}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{member.taxId}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Mail className="mr-2 h-3 w-3 text-gray-400" />
                              {member.email}
                            </div>
                            {member.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="mr-2 h-3 w-3 text-gray-400" />
                                {member.phone}
                              </div>
                            )}
                            {member.address && (
                              <div className="flex items-center text-sm">
                                <MapPin className="mr-2 h-3 w-3 text-gray-400" />
                                <span className="truncate max-w-[200px]">{member.address}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-blue-600">{member.points.toLocaleString()} 點</div>
                          {member.orderCount > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              訂單數: {member.orderCount}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-3 w-3 text-gray-400" />
                            {formatDate(member.createdAt)}
                          </div>
                          {member.lastLoginAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              最後登入: {formatDate(member.lastLoginAt)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/members/${member.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </div>
  )
}