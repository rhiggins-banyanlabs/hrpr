export interface DatabaseStats {
    chatSessions: number
    messages: number
    conferenceSessions: number
    speakers: number
    analytics: number
  }
  
  export interface HealthCheck {
    responseTime: number | null
    queryPerformance: 'good' | 'slow' | null
    dataIntegrity: boolean
    lastCheck: string | null
  }
  
  export interface ConnectionStatus {
    status: 'connected' | 'disconnected' | 'testing'
    lastChecked: string | null
    error?: string
  }
  
  export interface ExportOptions {
    type: 'all' | 'chat_sessions' | 'messages' | 'conference' | 'analytics'
    format: 'json' | 'csv'
    dateRange?: {
      start: string
      end: string
    }
  }
  
  export interface DatabaseMetrics {
    tableStats: Record<string, {
      rowCount: number
      sizeBytes: number
      lastUpdated: string
    }>
    queryPerformance: {
      avgResponseTime: number
      slowQueries: number
    }
    connectionPool: {
      active: number
      idle: number
      total: number
    }
  }