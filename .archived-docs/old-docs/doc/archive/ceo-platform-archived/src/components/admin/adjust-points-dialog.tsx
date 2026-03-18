'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Minus, Settings } from 'lucide-react'

interface AdjustPointsDialogProps {
  memberId: string
  currentPoints: number
  onSuccess?: () => void
}

export default function AdjustPointsDialog({ memberId, currentPoints, onSuccess }: AdjustPointsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'ADD' | 'SUBTRACT' | 'SET'>('ADD')
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    if (!amount || !reason.trim()) {
      toast.error('請填寫完整資訊')
      return
    }

    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('請輸入有效的點數')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${memberId}/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountNum,
          reason: reason.trim(),
          type,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('點數調整成功')
        setOpen(false)
        resetForm()
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.error(result.error || '點數調整失敗')
      }
    } catch (error) {
      toast.error('點數調整失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAmount('')
    setType('ADD')
    setReason('')
  }

  const getTypeIcon = () => {
    switch (type) {
      case 'ADD':
        return <Plus className="h-4 w-4" />
      case 'SUBTRACT':
        return <Minus className="h-4 w-4" />
      case 'SET':
        return <Settings className="h-4 w-4" />
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'ADD':
        return '增加點數'
      case 'SUBTRACT':
        return '減少點數'
      case 'SET':
        return '設定點數'
    }
  }

  const calculateNewPoints = () => {
    const amountNum = parseInt(amount) || 0
    switch (type) {
      case 'ADD':
        return currentPoints + amountNum
      case 'SUBTRACT':
        return currentPoints - amountNum
      case 'SET':
        return amountNum
      default:
        return currentPoints
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          調整點數
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>調整會員點數</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 當前點數顯示 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">目前點數</div>
            <div className="text-2xl font-bold text-blue-600">{currentPoints.toLocaleString()} 點</div>
          </div>

          {/* 調整類型 */}
          <div className="space-y-2">
            <Label htmlFor="type">調整類型</Label>
            <Select value={type} onValueChange={(value: 'ADD' | 'SUBTRACT' | 'SET') => setType(value)}>
              <SelectTrigger>
                <div className="flex items-center">
                  {getTypeIcon()}
                  <span className="ml-2">{getTypeLabel()}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADD">
                  <div className="flex items-center">
                    <Plus className="mr-2 h-4 w-4 text-green-500" />
                    增加點數
                  </div>
                </SelectItem>
                <SelectItem value="SUBTRACT">
                  <div className="flex items-center">
                    <Minus className="mr-2 h-4 w-4 text-red-500" />
                    減少點數
                  </div>
                </SelectItem>
                <SelectItem value="SET">
                  <div className="flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-blue-500" />
                    設定點數
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 調整金額 */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {type === 'SET' ? '設定點數為' : '調整點數'}
            </Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder={`輸入${type === 'SET' ? '新的點數' : '調整點數'}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* 調整原因 */}
          <div className="space-y-2">
            <Label htmlFor="reason">調整原因</Label>
            <Textarea
              id="reason"
              placeholder="請填寫點數調整原因..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* 預覽 */}
          {amount && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-800 mb-2">調整預覽</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-blue-600">目前點數</div>
                  <div className="font-medium">{currentPoints.toLocaleString()} 點</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600">調整後點數</div>
                  <div className="font-medium">{calculateNewPoints().toLocaleString()} 點</div>
                </div>
              </div>
              {type === 'SUBTRACT' && calculateNewPoints() < 0 && (
                <div className="mt-2 text-xs text-red-600">
                  注意：調整後點數將為負數
                </div>
              )}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !amount || !reason.trim()}>
              {loading ? '調整中...' : '確認調整'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}