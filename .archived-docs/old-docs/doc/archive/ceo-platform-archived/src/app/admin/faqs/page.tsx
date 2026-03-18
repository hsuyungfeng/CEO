import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ListOrdered } from 'lucide-react'
import FaqList from './components/FaqList'

export default function FaqsPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FAQ 管理</h1>
          <p className="mt-2 text-gray-600">管理常見問題與解答</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/faqs/reorder">
            <Button variant="outline">
              <ListOrdered className="mr-2 h-4 w-4" />
              排序 FAQ
            </Button>
          </Link>
          <Link href="/admin/faqs/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新增 FAQ
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQ 列表</CardTitle>
        </CardHeader>
        <CardContent>
          <FaqList />
        </CardContent>
      </Card>
    </div>
  )
}