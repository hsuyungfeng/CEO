'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/sidebar'
import AdminHeader from '@/components/admin/header'

interface User {
  name?: string | null
  email?: string | null
  role?: string | null
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        // 檢查當前 session
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (response.ok && data.user) {
          const currentUser = data.user
          const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN'

          if (!isAdmin) {
            router.push('/')
            return
          }

          setUser(currentUser)
          setLoading(false)
          return
        }

        // 未登入，重定向到登入頁面
        router.push('/login?redirect=/admin')
      } catch (error) {
        console.error('檢查認證錯誤:', error)
        router.push('/login?redirect=/admin')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">檢查權限中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // 正在重定向
  }

  // Create a safe user object for AdminHeader
  const safeUser = {
    name: user?.name || '管理員',
    email: user?.email || '',
    role: user?.role || 'ADMIN'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />
      <div className="lg:pl-64 transition-all duration-300">
        <AdminHeader user={safeUser} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}