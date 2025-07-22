// app/admin/page.tsx
"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/components/admin/security/AdminAuthContext'
import AdminLayout from '../../src/components/admin/layout/AdminLayout'

export default function AdminPage() {
  const { isAuthenticated } = useAdminAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <div className="text-white text-sm">Loading admin panel...</div>
        </div>
      </div>
    )
  }

  return <AdminLayout />
}