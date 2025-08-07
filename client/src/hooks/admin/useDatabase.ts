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

  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgResponseTime: null as number | null,
    responseTimes: [] as number[],
    queryTimes: {
      select: null as number | null,
      insert: null as number | null,
      count: null as number | null
    },
    uptime: 99.9,
    errorRate: 0
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

  // Comprehensive database performance test
  const testConnection = async () => {
    try {
      setConnectionStatus('testing')
      setError(null)
      
      const measurements = await runPerformanceTests()
      
      if (measurements.success) {
        setConnectionStatus('connected')
        
        // Update health check with real measurements
        setHealthCheck({
          responseTime: measurements.currentResponseTime,
          queryPerformance: measurements.avgResponseTime < 500 ? 'good' : 'slow',
          dataIntegrity: measurements.errorRate < 5,
          lastCheck: new Date().toISOString()
        })

        // Update performance metrics
        setPerformanceMetrics(prev => ({
          ...prev,
          avgResponseTime: measurements.avgResponseTime,
          responseTimes: measurements.responseTimes,
          queryTimes: measurements.queryTimes,
          errorRate: measurements.errorRate
        }))
      } else {
        setConnectionStatus('disconnected')
        setError(measurements.error || 'Performance test failed')
      }
      
      setLastChecked(new Date().toISOString())
    } catch (err) {
      setConnectionStatus('disconnected')
      setError(err instanceof Error ? err.message : 'Performance test failed')
      setLastChecked(new Date().toISOString())
    }
  }

  // Run comprehensive performance tests
  const runPerformanceTests = async () => {
    try {
      const measurements = []
      const queryTimes = { select: 0, count: 0, insert: 0 }
      let errorCount = 0
      const totalTests = 10

      console.log('🔍 Starting database performance tests...')

      // Test 1: Multiple SELECT queries to measure SELECT performance
      for (let i = 0; i < 3; i++) {
        try {
          const startTime = performance.now()
          await supabase.from('chat_sessions').select('id, created_at').limit(10)
          const endTime = performance.now()
          const duration = endTime - startTime
          queryTimes.select += duration
          measurements.push(duration)
        } catch (error) {
          errorCount++
          measurements.push(5000) // Consider errors as 5s response time
        }
      }
      queryTimes.select = queryTimes.select / 3

      // Test 2: COUNT queries to measure aggregation performance
      for (let i = 0; i < 3; i++) {
        try {
          const startTime = performance.now()
          await supabase.from('messages').select('*', { count: 'exact', head: true })
          const endTime = performance.now()
          const duration = endTime - startTime
          queryTimes.count += duration
          measurements.push(duration)
        } catch (error) {
          errorCount++
          measurements.push(5000)
        }
      }
      queryTimes.count = queryTimes.count / 3

      // Test 3: Complex queries to test JOIN performance
      for (let i = 0; i < 2; i++) {
        try {
          const startTime = performance.now()
          await supabase
            .from('messages')
            .select('id, session_id, sender, created_at')
            .order('created_at', { ascending: false })
            .limit(5)
          const endTime = performance.now()
          const duration = endTime - startTime
          measurements.push(duration)
        } catch (error) {
          errorCount++
          measurements.push(5000)
        }
      }

      // Test 4: Conference data queries
      for (let i = 0; i < 2; i++) {
        try {
          const startTime = performance.now()
          await supabase.from('conference_schedule').select('id, day, event').limit(5)
          const endTime = performance.now()
          const duration = endTime - startTime
          measurements.push(duration)
        } catch (error) {
          errorCount++
          measurements.push(3000) // Might fail if table doesn't exist
        }
      }

      // Calculate metrics
      const currentResponseTime = measurements[measurements.length - 1]
      const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length
      const errorRate = (errorCount / totalTests) * 100

      console.log('📊 Performance test results:', {
        avgResponseTime: Math.round(avgResponseTime),
        currentResponseTime: Math.round(currentResponseTime),
        queryTimes: {
          select: Math.round(queryTimes.select),
          count: Math.round(queryTimes.count)
        },
        errorRate: Math.round(errorRate)
      })

      return {
        success: true,
        avgResponseTime,
        currentResponseTime,
        responseTimes: measurements,
        queryTimes,
        errorRate
      }
    } catch (error) {
      console.error('❌ Performance test failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Performance test failed',
        avgResponseTime: null,
        currentResponseTime: null,
        responseTimes: [],
        queryTimes: { select: null, count: null, insert: null },
        errorRate: 100
      }
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
    performanceMetrics,
    
    // Actions
    testConnection,
    exportData,
    refreshData,
    loadStats
  }
}