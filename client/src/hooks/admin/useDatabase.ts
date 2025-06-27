import { useState, useEffect } from 'react'
import { supabase, ChatStorageService, ConferenceStorageService } from '@/lib/supabase/chatStorage'
import { getDatabaseStats, testDatabaseConnection, exportDatabaseData } from '@/lib/services/databaseService'
import type { DatabaseStats, HealthCheck } from '@/types/database'

export default function useDatabase() {
  const [stats, setStats] = useState<DatabaseStats>({
    chatSessions: 0,
    messages: 0,
    conferenceSessions: 0,
    speakers: 0,
    analytics: 0
  })
  
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected')
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [healthCheck, setHealthCheck] = useState<HealthCheck>({
    responseTime: null,
    queryPerformance: null,
    dataIntegrity: true,
    lastCheck: null
  })

  // Load database statistics
  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const statsData = await getDatabaseStats()
      setStats(statsData)
    } catch (err) {
      console.error('Error loading database stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load database stats')
    } finally {
      setLoading(false)
    }
  }

  // Test database connection
  const testConnection = async () => {
    try {
      setConnectionStatus('testing')
      setError(null)
      
      const startTime = Date.now()
      const result = await testDatabaseConnection()
      const responseTime = Date.now() - startTime
      
      if (result.success) {
        setConnectionStatus('connected')
        setHealthCheck({
          responseTime,
          queryPerformance: responseTime < 500 ? 'good' : 'slow',
          dataIntegrity: true,
          lastCheck: new Date().toISOString()
        })
      } else {
        setConnectionStatus('disconnected')
        setError(result.error || 'Connection test failed')
      }
      
      setLastChecked(new Date().toISOString())
    } catch (err) {
      setConnectionStatus('disconnected')
      setError(err instanceof Error ? err.message : 'Connection test failed')
      setLastChecked(new Date().toISOString())
    }
  }

  // Export data
  const exportData = async (type: string, format: string) => {
    try {
      setLoading(true)
      await exportDatabaseData(type, format)
    } catch (err) {
      console.error('Error exporting data:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  // Initialize connection status
  const initializeConnection = async () => {
    if (supabase) {
      setConnectionStatus('connected')
      setLastChecked(new Date().toISOString())
      await loadStats()
    } else {
      setConnectionStatus('disconnected')
      setLoading(false)
    }
  }

  // Refresh all data
  const refreshData = () => {
    loadStats()
    testConnection()
  }

  // Load initial data
  useEffect(() => {
    initializeConnection()
  }, [])

  return {
    // Data
    stats,
    connectionStatus,
    lastChecked,
    loading,
    error,
    healthCheck,
    
    // Actions
    testConnection,
    exportData,
    refreshData,
    loadStats
  }
}