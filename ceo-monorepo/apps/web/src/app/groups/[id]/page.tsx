'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GroupDetail } from '@/components/groups/group-detail'

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/groups">
            <Button variant="ghost" size="sm">← 返回列表</Button>
          </Link>
          <h1 className="text-2xl font-bold">團購詳情</h1>
        </div>
        <GroupDetail groupId={id} />
      </div>
    </div>
  )
}
