'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CreateGroupForm } from '@/components/groups/create-group-form'

export default function CreateGroupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/groups">
            <Button variant="ghost" size="sm">← 返回列表</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">發起新團購</h1>
            <p className="text-gray-500 text-sm">設定商品與截止時間，邀請成員一起訂購享折扣</p>
          </div>
        </div>
        <CreateGroupForm />
      </div>
    </div>
  )
}
