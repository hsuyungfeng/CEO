import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Calendar, User, MessageSquare } from 'lucide-react';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default async function ContactMessageDetailPage({ params }: RouteParams) {
  const { id } = await params;

  // 獲取聯絡訊息數據
  let message: ContactMessage | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/contact-messages/${id}`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      message = result.data;
    } else {
      error = result.error || '獲取聯絡訊息數據失敗';
    }
  } catch (err) {
    console.error('獲取聯絡訊息數據錯誤:', err);
    error = '獲取聯絡訊息數據時發生錯誤';
  }

  // 如果獲取數據失敗，顯示錯誤
  if (error || !message) {
    return (
      <div>
        <div className="mb-8">
          <Link href="/admin/messages">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回聯絡訊息列表
            </Button>
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">聯絡訊息詳情</h1>
            <p className="mt-2 text-gray-600">查看聯絡訊息詳細內容</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error || '聯絡訊息不存在'}</p>
              <Link href="/admin/messages">
                <Button variant="outline">返回聯絡訊息列表</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/messages">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回聯絡訊息列表
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">聯絡訊息詳情</h1>
            <p className="mt-2 text-gray-600">查看聯絡訊息詳細內容</p>
          </div>
          <Badge variant={message.isRead ? "default" : "secondary"}>
            {message.isRead ? '已讀' : '未讀'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左側：聯絡人資訊 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>聯絡人資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">姓名</p>
                  <p className="font-medium">{message.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a 
                    href={`mailto:${message.email}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {message.email}
                  </a>
                </div>
              </div>

              {message.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">電話</p>
                    <a 
                      href={`tel:${message.phone}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {message.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">提交時間</p>
                  <p className="font-medium">{formatDate(message.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：訊息內容 */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>訊息內容</CardTitle>
              {message.subject && (
                <p className="text-lg font-medium text-gray-900">{message.subject}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-gray-50 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">訊息內容</p>
                    <div className="whitespace-pre-wrap text-gray-900">
                      {message.message}
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="mt-6 flex justify-end gap-2">
                <Link href="/admin/messages">
                  <Button variant="outline">返回列表</Button>
                </Link>
                <Button asChild>
                  <a href={`mailto:${message.email}${message.subject ? `?subject=回覆: ${message.subject}` : ''}`}>
                    回覆訊息
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}