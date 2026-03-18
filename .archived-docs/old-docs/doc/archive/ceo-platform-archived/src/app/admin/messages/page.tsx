import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail } from 'lucide-react'
import ContactMessageList from './components/ContactMessageList'

export default function MessagesPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">聯絡訊息管理</h1>
          <p className="mt-2 text-gray-600">查看和管理用戶提交的聯絡訊息</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              返回儀表板
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>聯絡訊息列表</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactMessageList />
        </CardContent>
      </Card>
    </div>
  )
}