export interface AnalyticsData {
    totalUsers: number
    totalMessages: number
    avgSessionLength: number
    dbStatus: 'Connected' | 'Disconnected'
    recentQuestions: string[]
    recentEvents: AnalyticsEvent[]
  }
  
  export interface AnalyticsEvent {
    id?: string
    type: string
    timestamp?: string
    message?: string
    data?: Record<string, unknown>
  }
  
  export interface LocalStorageEvent {
    type: string
    timestamp: string
    message?: string
    email?: string
    sessionId?: string
    [key: string]: string | undefined
  }