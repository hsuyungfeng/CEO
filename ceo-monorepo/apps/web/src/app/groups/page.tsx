'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GroupList } from '@/components/groups/group-list'

export default function GroupsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">團購列表</h1>
            <p className="text-gray-500 mt-1">加入進行中的團購，享受階梯折扣返利</p>
          </div>
          <Link href="/groups/create">
            <Button>+ 發起新團購</Button>
          </Link>
        </div>
        <GroupList />
      </div>
    </div>
  )
}
