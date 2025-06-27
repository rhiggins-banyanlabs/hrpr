import { supabase, ChatStorageService, ConferenceStorageService } from '@/lib/supabase/chatStorage'
import type { DatabaseStats } from '@/types/database'

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const stats: DatabaseStats = {
    chatSessions: 0,
    messages: 0,
    conferenceSessions: 0,
    speakers: 0,
    analytics: 0
  }

  if (!supabase) {
    return stats
  }

  try {
    // Get chat sessions count
    const { count: chatSessionsCount } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
    
    // Get messages count
    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
    
    // Get conference sessions count
    const { count: conferenceSessionsCount } = await supabase
      .from('event_sessions')
      .select('*', { count: 'exact', head: true })
    
    // Get speakers count
    const { count: speakersCount } = await supabase
      .from('speakers')
      .select('*', { count: 'exact', head: true })
    
    // Get analytics count
    const { count: analyticsCount } = await supabase
      .from('chat_analytics')
      .select('*', { count: 'exact', head: true })

    stats.chatSessions = chatSessionsCount || 0
    stats.messages = messagesCount || 0
    stats.conferenceSessions = conferenceSessionsCount || 0
    stats.speakers = speakersCount || 0
    stats.analytics = analyticsCount || 0

  } catch (error) {
    console.error('Error fetching database stats:', error)
  }

  return stats
}

export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    // Simple query to test connection
    const { error } = await supabase
      .from('chat_sessions')
      .select('id')
      .limit(1)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error' 
    }
  }
}

export async function exportDatabaseData(type: string, format: string): Promise<void> {
  if (!supabase) {
    throw new Error('Database not connected')
  }

  let data: any = {}
  let filename = `beacon-export-${new Date().toISOString().split('T')[0]}`

  try {
    switch (type) {
      case 'all':
        const [sessions, messages, conferenceSessions, speakers, analytics] = await Promise.all([
          ChatStorageService.getAllSessions(),
          supabase.from('messages').select('*'),
          ConferenceStorageService.getAllSessions(),
          ConferenceStorageService.getAllSpeakers(),
          ChatStorageService.getAllAnalytics()
        ])
        
        data = {
          chat_sessions: sessions,
          messages: messages.data || [],
          conference_sessions: conferenceSessions,
          speakers,
          analytics,
          exported_at: new Date().toISOString(),
          summary: {
            total_chat_sessions: sessions.length,
            total_messages: messages.data?.length || 0,
            total_conference_sessions: conferenceSessions.length,
            total_speakers: speakers.length,
            total_analytics: analytics.length
          }
        }
        filename = `beacon-complete-export-${new Date().toISOString().split('T')[0]}`
        break

      case 'chat_sessions':
        data = await ChatStorageService.getAllSessions()
        filename = `beacon-chat-sessions-${new Date().toISOString().split('T')[0]}`
        break

      case 'messages':
        const messagesResult = await supabase.from('messages').select('*')
        data = messagesResult.data || []
        filename = `beacon-messages-${new Date().toISOString().split('T')[0]}`
        break

      case 'conference':
        const [confSessions, confSpeakers] = await Promise.all([
          ConferenceStorageService.getAllSessions(),
          ConferenceStorageService.getAllSpeakers()
        ])
        data = {
          sessions: confSessions,
          speakers: confSpeakers,
          exported_at: new Date().toISOString()
        }
        filename = `beacon-conference-${new Date().toISOString().split('T')[0]}`
        break

      case 'analytics':
        data = await ChatStorageService.getAllAnalytics()
        filename = `beacon-analytics-${new Date().toISOString().split('T')[0]}`
        break

      default:
        throw new Error('Invalid export type')
    }

    // Export based on format
    if (format === 'json') {
      exportAsJSON(data, `${filename}.json`)
    } else if (format === 'csv') {
      exportAsCSV(data, `${filename}.csv`)
    } else {
      throw new Error('Invalid export format')
    }

  } catch (error) {
    console.error('Error exporting data:', error)
    throw error
  }
}

function exportAsJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  })
  downloadBlob(blob, filename)
}

function exportAsCSV(data: any, filename: string): void {
  let csvContent = ''
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      csvContent = 'No data available'
    } else {
      // Get headers from first object
      const headers = Object.keys(data[0])
      csvContent = headers.join(',') + '\n'
      
      // Add data rows
      data.forEach(item => {
        const row = headers.map(header => {
          const value = item[header]
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value || ''
        })
        csvContent += row.join(',') + '\n'
      })
    }
  } else {
    // Handle object data by converting to key-value pairs
    csvContent = 'Key,Value\n'
    Object.entries(data).forEach(([key, value]) => {
      csvContent += `${key},"${typeof value === 'object' ? JSON.stringify(value) : value}"\n`
    })
  }

  const blob = new Blob([csvContent], { type: 'text/csv' })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}