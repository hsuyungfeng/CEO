'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface OrderStatusUpdateProps {
  orderId: string
  currentStatus: string
}

const statusOptions = [
  { value: 'PENDING', label: '待處理' },
  { value: 'CONFIRMED', label: '已確認' },
  { value: 'SHIPPED', label: '已出貨' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
]

export default function OrderStatusUpdate({ orderId, currentStatus }: OrderStatusUpdateProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [note, setNote] = useState('')

  const handleUpdateStatus = async () => {
    if (status === currentStatus) {
      toast.info('訂單狀態未變更')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          note: note.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('更新訂單狀態失敗')
      }

      toast.success('訂單狀態更新成功')
      router.refresh()
    } catch (error) {
      toast.error('更新訂單狀態失敗')
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
        <Label htmlFor="note">狀態變更備註</Label>
        <Textarea
          id="note"
          placeholder="可選：填寫狀態變更原因或備註"
          value={note}
          onChange={(e) => setNote(e.target.value)}
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