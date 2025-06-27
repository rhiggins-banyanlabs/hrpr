// Re-export types from supabase for consistency
import type { ChatSession, Message } from '@/lib/supabase/chatStorage'
export type { ChatSession, Message, ChatAnalytics } from '@/lib/supabase/chatStorage'


export interface ChatSessionStats {
  total: number
  active: number
  ended: number
  withVoice: number
}

export interface ChatSource {
  name: string
  count: number
}

export interface MessageViewerState {
  isOpen: boolean
  session: ChatSession | null
  messages: Message[]
  loading: boolean
}

export interface ChatDataFilters {
  dateRange?: {
    start: string
    end: string
  }
  status?: 'all' | 'active' | 'ended'
  source?: string
  hasVoice?: boolean
}