// app/admin/page.tsx
"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/components/admin/security/AdminAuthContext'
import { AdminLoginModal } from '@/components/admin/security/AdminLoginModal'
import { AdminLoginForm } from '@/components/admin/security/AdminLoginForm'
import AdminLayout from '../../src/components/admin/layout/AdminLayout'

export default function AdminPage() {
  const { isAuthenticated } = useAdminAuth()
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    // Show login modal if not authenticated instead of redirecting
    if (!isAuthenticated) {
      console.log('Admin page: Not authenticated, will show login modal');
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        console.log('Admin page: Setting showLoginModal to true');
        setShowLoginModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated])

  // Handle successful login
  const handleLoginClose = () => {
    setShowLoginModal(false)
    if (!isAuthenticated) {
      // If still not authenticated (user closed modal), go home
      router.push('/')
    }
  }

  if (!isAuthenticated) {
    // Use inline form instead of modal for better iOS compatibility
    return <AdminLoginForm />
  }

  return <AdminLayout />
}