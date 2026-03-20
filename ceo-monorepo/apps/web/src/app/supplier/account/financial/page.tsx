'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'

interface AccountInfo {
  id: string
  balance: number
  billingRate: number
  totalSpent: number
  isSuspended: boolean
  isLowBalance: boolean
  paymentDueDate: string | null
}

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: '儲值', BILLING: '帳單扣款', REFUND: '退款', ADJUSTMENT: '人工調整',
}
const TYPE_COLOR: Record<string, string> = {
  DEPOSIT: 'text-green-600', BILLING: 'text-red-500', REFUND: 'text-blue-500', ADJUSTMENT: 'text-yellow-600',
}

export default function SupplierFinancialPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [loadingTx, setLoadingTx] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [depositError, setDepositError] = useState('')

  useEffect(() => { fetchAccount() }, [])
  useEffect(() => { fetchTransactions(page) }, [page])

  const fetchAccount = async () => {
    try {
      setLoadingAccount(true)
      const res = await fetch('/api/supplier/account')
      const data = await res.json()
      if (data.success) setAccount(data.data)
      else setError(data.error || '載入失敗')
    } catch {
      setError('帳戶資訊載入失敗')
    } finally {
      setLoadingAccount(false)
    }
  }

  const fetchTransactions = async (p: number) => {
    try {
      setLoadingTx(true)
      const res = await fetch(`/api/supplier/transactions?page=${p}&limit=15`)
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data)
        setTotalPages(Math.ceil((data.total || 0) / 15))
      }
    } catch {
      // non-critical
    } finally {
      setLoadingTx(false)
    }
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) { setDepositError('請輸入有效金額'); return }
    try {
      setDepositing(true)
      setDepositError('')
      const res = await fetch('/api/supplier/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '儲值失敗')
      setShowDepositDialog(false)
      setDepositAmount('')
      fetchAccount()
      fetchTransactions(1)
      setPage(1)
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : '儲值失敗')
    } finally {
      setDepositing(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount)

  if (loadingAccount) return <div className="p-6 text-center text-gray-500">載入中...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!account) return null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">財務資訊</h1>
        <Button variant="outline" size="sm" onClick={() => { fetchAccount(); fetchTransactions(page) }}>
          <RefreshCw className="h-4 w-4 mr-1" />重新整理
        </Button>
      </div>

      {(account.isLowBalance || account.isSuspended) && (
        <div className={`flex items-center gap-2 p-4 rounded border ${account.isSuspended ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
          <AlertTriangle className="h-5 w-5" />
          <span>{account.isSuspended ? '帳號已停用，請聯繫管理員' : '帳戶餘額不足，請及時儲值以避免服務中斷'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">帳戶餘額</p>
                <p className={`text-3xl font-bold ${account.isLowBalance ? 'text-red-500' : 'text-green-600'}`}>
                  {formatCurrency(account.balance)}
                </p>
                {account.paymentDueDate && (
                  <p className="text-xs text-gray-400 mt-2">
                    繳費截止：{new Date(account.paymentDueDate).toLocaleDateString('zh-TW')}
                  </p>
                )}
              </div>
              <Wallet className="h-8 w-8 text-gray-300" />
            </div>
            <Button className="w-full mt-4" onClick={() => setShowDepositDialog(true)}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />儲值
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">帳單費率</p>
            <p className="text-3xl font-bold">{account.billingRate}%</p>
            <p className="text-xs text-gray-400 mt-2">每月帳單費用比率</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-1">累計消費</p>
            <p className="text-2xl font-bold">{formatCurrency(account.totalSpent)}</p>
            <div className="mt-2">
              <Badge variant={account.isSuspended ? 'destructive' : 'default'}>
                {account.isSuspended ? '已停用' : '正常'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>交易記錄</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="text-center py-8 text-gray-500">載入中...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">尚無交易記錄</div>
          ) : (
            <>
              <div className="space-y-0">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{TYPE_LABEL[tx.type] || tx.type}</p>
                        {tx.note && <p className="text-xs text-gray-500">{tx.note}</p>}
                        <p className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleString('zh-TW')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${TYPE_COLOR[tx.type] || ''}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-400">餘額 {formatCurrency(tx.balanceAfter)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    上一頁
                  </Button>
                  <span className="text-sm text-gray-500">第 {page} / {totalPages} 頁</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    下一頁
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>帳戶儲值</DialogTitle>
            <DialogDescription>輸入儲值金額（最高 NT$ 1,000,000）</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="depositAmount">儲值金額 (NT$)</Label>
              <Input
                id="depositAmount"
                type="number"
                min="1"
                max="1000000"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="輸入金額"
              />
            </div>
            {depositError && <p className="text-sm text-red-600">{depositError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>取消</Button>
            <Button onClick={handleDeposit} disabled={depositing}>
              {depositing ? '處理中...' : '確認儲值'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
