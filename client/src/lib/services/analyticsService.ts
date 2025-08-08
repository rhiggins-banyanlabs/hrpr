import { supabase } from '@/lib/supabase/chatStorage'
import type { AnalyticsData } from '@/types/analytics'

export async function getAnalyticsData(): Promise<AnalyticsData> {
  // Get localStorage analytics (safe for SSR)
  let localAnalytics = []
  if (typeof window !== 'undefined') {
    try {
      localAnalytics = JSON.parse(localStorage.getItem('beacon_analytics') || '[]')
    } catch (error) {
      console.error('Error parsing localStorage analytics:', error)
      localAnalytics = []
    }
  }

  // Calculate analytics from localStorage
  const userRegistrations = localAnalytics.filter((event: any) => 
    event.type === 'user_registration'
  ).length

  const userMessages = localAnalytics.filter((event: any) => 
    event.type === 'user_message'
  ).length

  const sessionStarts = localAnalytics.filter((event: any) => 
    event.type === 'chat_session_start'
  ).length

  const avgSessionLength = sessionStarts > 0 ? Math.round(userMessages / sessionStarts) : 0

  const recentQuestions = localAnalytics
    .filter((event: any) => event.type === 'user_message')
    .slice(-5)
    .map((event: any) => event.message || 'No message content')
    .reverse()

  const recentEvents = localAnalytics.slice(-10).reverse()

  // Check database status
  const dbStatus = supabase ? 'Connected' : 'Disconnected'

  // If we have Supabase connection, try to get additional analytics
  let dbSessionCount = 0
  let dbMessageCount = 0

  if (supabase) {
    try {
      // Get session count
      const { count: sessionCount } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
      
      // Get message count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })

      dbSessionCount = sessionCount || 0
      dbMessageCount = messageCount || 0
    } catch (error) {
      console.error('Error fetching database analytics:', error)
    }
  }

  return {
    totalUsers: Math.max(userRegistrations, dbSessionCount), // Use higher of the two
    totalMessages: Math.max(userMessages, dbMessageCount), // Use higher of the two
    avgSessionLength,
    dbStatus,
    recentQuestions,
    recentEvents
  }
}