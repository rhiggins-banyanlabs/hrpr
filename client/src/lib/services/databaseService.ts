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
    
    // Get conference schedule events count (instead of event_sessions)
    const { count: conferenceEventsCount } = await supabase
      .from('conference_schedule')
      .select('*', { count: 'exact', head: true })
    
    // Get committee meetings count (as proxy for speakers/presenters)
    const { count: committeeMeetingsCount } = await supabase
      .from('committee_meetings')
      .select('*', { count: 'exact', head: true })
    
    // Get session feedback count (as analytics)
    const { count: feedbackCount } = await supabase
      .from('session_feedback')
      .select('*', { count: 'exact', head: true })

    stats.chatSessions = chatSessionsCount || 0
    stats.messages = messagesCount || 0
    stats.conferenceSessions = conferenceEventsCount || 0
    stats.speakers = committeeMeetingsCount || 0 // Using meetings as proxy
    stats.analytics = feedbackCount || 0

    console.log('📊 Database Stats:', stats)

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
    console.log(`📤 Starting export: ${type} as ${format}`)

    switch (type) {
      case 'all':
        // Export all main data tables
        const [
          chatSessionsResult,
          messagesResult,
          conferenceScheduleResult,
          committeeMeetingsResult,
          facilityToursResult,
          sessionFeedbackResult
        ] = await Promise.all([
          supabase.from('chat_sessions').select('*').order('created_at', { ascending: false }),
          supabase.from('messages').select('*').order('created_at', { ascending: false }),
          supabase.from('conference_schedule').select('*').order('start_time', { ascending: true }),
          supabase.from('committee_meetings').select('*').order('start_time', { ascending: true }),
          supabase.from('facility_tours').select('*').order('tour_time', { ascending: true }),
          supabase.from('session_feedback').select('*').order('created_at', { ascending: false })
        ])
        
        data = {
          chat_sessions: chatSessionsResult.data || [],
          messages: messagesResult.data || [],
          conference_schedule: conferenceScheduleResult.data || [],
          committee_meetings: committeeMeetingsResult.data || [],
          facility_tours: facilityToursResult.data || [],
          session_feedback: sessionFeedbackResult.data || [],
          exported_at: new Date().toISOString(),
          summary: {
            total_chat_sessions: chatSessionsResult.data?.length || 0,
            total_messages: messagesResult.data?.length || 0,
            total_conference_events: conferenceScheduleResult.data?.length || 0,
            total_committee_meetings: committeeMeetingsResult.data?.length || 0,
            total_facility_tours: facilityToursResult.data?.length || 0,
            total_feedback: sessionFeedbackResult.data?.length || 0
          }
        }
        filename = `beacon-complete-export-${new Date().toISOString().split('T')[0]}`
        break

      case 'chat_sessions':
        const sessionsResult = await supabase
          .from('chat_sessions')
          .select('*')
          .order('created_at', { ascending: false })
        data = sessionsResult.data || []
        filename = `beacon-chat-sessions-${new Date().toISOString().split('T')[0]}`
        break

      case 'messages':
        const messagesOnlyResult = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false })
        data = messagesOnlyResult.data || []
        filename = `beacon-messages-${new Date().toISOString().split('T')[0]}`
        break

      case 'conference':
        // Export all conference-related data
        const [scheduleResult, meetingsResult, toursResult] = await Promise.all([
          supabase.from('conference_schedule').select('*').order('start_time', { ascending: true }),
          supabase.from('committee_meetings').select('*').order('start_time', { ascending: true }),
          supabase.from('facility_tours').select('*').order('tour_time', { ascending: true })
        ])
        
        data = {
          conference_schedule: scheduleResult.data || [],
          committee_meetings: meetingsResult.data || [],
          facility_tours: toursResult.data || [],
          exported_at: new Date().toISOString(),
          summary: {
            total_schedule_events: scheduleResult.data?.length || 0,
            total_committee_meetings: meetingsResult.data?.length || 0,
            total_facility_tours: toursResult.data?.length || 0
          }
        }
        filename = `beacon-conference-${new Date().toISOString().split('T')[0]}`
        break

      case 'analytics':
        // Export feedback and usage analytics
        const [feedbackResult, recentMessagesResult] = await Promise.all([
          supabase.from('session_feedback').select('*').order('created_at', { ascending: false }),
          supabase.from('messages').select('sender, message_text, created_at, session_id').order('created_at', { ascending: false }).limit(1000)
        ])
        
        data = {
          feedback_data: feedbackResult.data || [],
          recent_messages_sample: recentMessagesResult.data || [],
          exported_at: new Date().toISOString(),
          summary: {
            total_feedback_entries: feedbackResult.data?.length || 0,
            sample_messages_count: recentMessagesResult.data?.length || 0
          }
        }
        filename = `beacon-analytics-${new Date().toISOString().split('T')[0]}`
        break

      default:
        throw new Error('Invalid export type')
    }

    console.log(`✅ Export data prepared for ${type}:`, {
      dataKeys: typeof data === 'object' ? Object.keys(data) : 'array',
      dataSize: Array.isArray(data) ? data.length : 'object'
    })

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