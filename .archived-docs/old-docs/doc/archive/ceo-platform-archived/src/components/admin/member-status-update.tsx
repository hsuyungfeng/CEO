'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface MemberStatusUpdateProps {
  memberId: string
  currentStatus: string
  onSuccess?: () => void
}

const statusOptions = [
  { value: 'ACTIVE', label: '啟用中' },
  { value: 'INACTIVE', label: '未啟用' },
  { value: 'SUSPENDED', label: '已停權' },
  { value: 'DELETED', label: '已刪除' },
]

export default function MemberStatusUpdate({ memberId, currentStatus, onSuccess }: MemberStatusUpdateProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [reason, setReason] = useState('')

  const handleUpdateStatus = async () => {
    if (status === currentStatus) {
      toast.info('會員狀態未變更')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          reason: reason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('更新會員狀態失敗')
      }

      toast.success('會員狀態更新成功')
      router.refresh()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast.error('更新會員狀態失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="status">變更狀態</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="選擇狀態" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reason">狀態變更原因</Label>
        <Textarea
          id="reason"
          placeholder="可選：填寫狀態變更原因"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </div>

      <Button 
        onClick={handleUpdateStatus} 
        disabled={loading || status === currentStatus}
        className="w-full"
      >
        {loading ? '更新中...' : '更新狀態'}
      </Button>
    </div>
  )
}