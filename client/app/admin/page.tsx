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
        <div className="text-white">Redirecting...</div>
      </div>
    )
  }

  return <AdminLayout />
}