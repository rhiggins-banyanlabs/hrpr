import { useState, useEffect } from 'react'
import { ChatStorageService, ChatSession, Message, ChatAnalytics, supabase } from '@/lib/supabase/chatStorage'

export default function useChatData() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [analytics, setAnalytics] = useState<ChatAnalytics[]>([])
  const [sessionMessages, setSessionMessages] = useState<Message[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageViewOpen, setMessageViewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all chat data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [sessionsData, analyticsData] = await Promise.all([
        ChatStorageService.getAllSessions(),
        ChatStorageService.getAllAnalytics()
      ])
      
      setSessions(sessionsData || [])
      setAnalytics(analyticsData || [])
      
      console.log('Raw sessions data from database:', sessionsData)
      console.log('Number of sessions:', sessionsData?.length || 0)
      
      // Debug logging for date issues
      if (sessionsData && sessionsData.length > 0) {
        console.log('First session full object:', sessionsData[0])
        console.log('All session IDs:', sessionsData.map(s => s.id))
        console.log('Session start times:', sessionsData.map(s => ({
          id: s.id.substring(0, 8),
          session_started_at: s.session_started_at,
          created_at: s.created_at,
          typeof_started: typeof s.session_started_at,
          typeof_created: typeof s.created_at
        })))
      }
      
    } catch (err) {
      console.error('Error loading chat data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chat data')
    } finally {
      setLoading(false)
    }
  }

  // Load messages for a specific session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      setMessagesLoading(true)
      console.log('🔍 Starting to load messages for session:', sessionId)
      
      if (!supabase) {
        throw new Error('Supabase not connected')
      }

      // Try direct query to messages table
      console.log('🔍 Querying messages table directly...')
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('message_timestamp', { ascending: true })

      console.log('🔍 Direct query result:', { messages, error })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      if (!messages) {
        console.log('🔍 No messages returned from query')
        setSessionMessages([])
        return
      }

      console.log('🔍 Successfully loaded messages:', messages.length, 'messages')
      console.log('🔍 First message sample:', messages[0])
      
      setSessionMessages(messages)
    } catch (err) {
      console.error('❌ Error loading session messages:', err)
      setSessionMessages([])
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  // View a specific session's messages
  const viewSession = async (session: ChatSession) => {
    console.log('👁️ ViewSession called with:', session)
    console.log('👁️ Session ID:', session.id)
    
    setSelectedSession(session)
    setMessageViewOpen(true)
    console.log('👁️ Modal should be open now, messageViewOpen set to true')
    
    await loadSessionMessages(session.id)
  }

  // Close message viewer
  const closeMessageViewer = () => {
    console.log('❌ Closing message viewer')
    setMessageViewOpen(false)
    setSelectedSession(null)
    setSessionMessages([])
  }

  // Delete a chat session
  const deleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat session? This will also delete all associated messages.")) {
      return false
    }

    try {
      if (!supabase) {
        throw new Error('Database not connected')
      }

      // Delete messages first (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('session_id', sessionId)

      if (messagesError) {
        throw new Error(`Failed to delete messages: ${messagesError.message}`)
      }

      // Then delete the session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)

      if (sessionError) {
        throw new Error(`Failed to delete session: ${sessionError.message}`)
      }

      // Update local state
      setSessions(prev => prev.filter(session => session.id !== sessionId))
      
      // Close message viewer if this session was being viewed
      if (selectedSession?.id === sessionId) {
        closeMessageViewer()
      }

      return true
    } catch (err) {
      console.error('Error deleting session:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete session')
      return false
    }
  }

  // Refresh all data
  const refreshData = () => {
    loadData()
  }

  // Export chat data
  const exportData = () => {
    const data = {
      sessions,
      analytics,
      summary: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => !s.session_ended_at).length,
        totalAnalytics: analytics.length,
        dateRange: {
          earliest: sessions.reduce((earliest, session) => 
            !earliest || session.session_started_at < earliest 
              ? session.session_started_at 
              : earliest, ''),
          latest: sessions.reduce((latest, session) => 
            !latest || session.session_started_at > latest 
              ? session.session_started_at 
              : latest, '')
        }
      },
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Analytics helpers
  const getSessionStats = () => {
    return {
      total: sessions.length,
      active: sessions.filter(s => !s.session_ended_at).length,
      ended: sessions.filter(s => s.session_ended_at).length,
      withVoice: sessions.filter(s => 
        s.metadata?.source === 'voice_activation' || 
        s.metadata?.initial_query
      ).length
    }
  }

  const getTopSources = () => {
    const sources: Record<string, number> = {}
    sessions.forEach(session => {
      const source = session.metadata?.source || 'unknown'
      sources[source] = (sources[source] || 0) + 1
    })
    return Object.entries(sources)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
  }

  const getRecentActivity = () => {
    return sessions
      .sort((a, b) => 
        new Date(b.session_started_at).getTime() - 
        new Date(a.session_started_at).getTime()
      )
      .slice(0, 5)
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 messageViewOpen changed to:', messageViewOpen)
    console.log('🔍 selectedSession changed to:', selectedSession?.id)
    console.log('🔍 sessionMessages length:', sessionMessages.length)
  }, [messageViewOpen, selectedSession, sessionMessages])

  return {
    // Data
    sessions,
    analytics,
    sessionMessages,
    selectedSession,
    loading,
    messagesLoading,
    messageViewOpen,
    error,
    
    // Actions
    refreshData,
    exportData,
    viewSession,
    closeMessageViewer,
    deleteSession,
    
    // Analytics helpers
    getSessionStats,
    getTopSources,
    getRecentActivity
  }
}