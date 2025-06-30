import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/chatStorage'
import { getAnalyticsData } from '@/lib/services/analyticsService'
import type { AnalyticsData } from '@/types/analytics'

export default function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalMessages: 0,
    avgSessionLength: 0,
    dbStatus: 'Disconnected',
    recentQuestions: [],
    recentEvents: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAnalyticsData()
      setAnalytics(data)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const refreshAnalytics = () => {
    loadAnalytics()
  }

  const exportAnalytics = () => {
    const exportData = {
      ...analytics,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  return {
    analytics,
    loading,
    error,
    refreshAnalytics,
    exportAnalytics
  }
}