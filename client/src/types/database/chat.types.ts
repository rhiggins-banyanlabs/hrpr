export interface ChatSession {
  id: string;
  user_id?: string;
  session_started_at: string;
  session_ended_at?: string;
  is_active: boolean;
  user_agent?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  sender: 'user' | 'connie';
  message_text: string;
  message_timestamp: string;
  is_voice_input?: boolean;
  voice_transcript?: string;
  selected_voice?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatAnalytics {
  id: string;
  session_id: string;
  event_type: string;
  event_data?: Record<string, any>;
  created_at: string;
}

export interface MessageFeedback {
  id: string;
  message_id: string;
  session_id: string;
  feedback_type: 'thumbs_up' | 'thumbs_down';
  created_at: string;
  updated_at: string;
}