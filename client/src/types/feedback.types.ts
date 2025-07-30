// Feedback system types and state machine

export enum FeedbackState {
  IDLE = 'IDLE',
  WAITING_FOR_SILENCE = 'WAITING_FOR_SILENCE',
  ASKING_MORE_QUESTIONS = 'ASKING_MORE_QUESTIONS',
  ASKING_SATISFACTION = 'ASKING_SATISFACTION',
  COLLECTING_FEEDBACK = 'COLLECTING_FEEDBACK',
  THANKING_USER = 'THANKING_USER',
  RESETTING_SESSION = 'RESETTING_SESSION'
}

export interface FeedbackSession {
  sessionId: string;
  timestamp: Date;
  satisfied: boolean;
  feedbackText?: string;
  conversationCount: number;
  userId?: string;
}

export interface FeedbackTransition {
  from: FeedbackState;
  to: FeedbackState;
  trigger: 'silence' | 'user_yes' | 'user_no' | 'user_response' | 'timeout' | 'reset';
  action?: () => Promise<void>;
}

export interface LatencyMetrics {
  apiResponseTime: number; // ms
  ttsGenerationTime: number; // ms
  audioPlaybackTime: number; // ms
  averageLatency: number; // ms
}

export interface FeedbackConfig {
  initialSilenceTimeout: number; // 3 seconds after answer
  feedbackSilenceTimeout: number; // 5 seconds during feedback
  moreQuestionsTimeout: number; // 5 seconds after asking "more questions"
  // Latency adjustment settings
  latencyBufferMultiplier: number; // Multiplier for average latency (e.g., 1.5x)
  minTimeout: number; // Minimum timeout regardless of latency
  maxTimeout: number; // Maximum timeout to prevent excessive waits
  messages: {
    moreQuestions: string;
    readyToHelp: string;
    satisfaction: string;
    goodbye: string;
    requestFeedback: string;
    thankYou: string;
  };
}

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
  initialSilenceTimeout: 10000, // 10 seconds after response before asking if they need help
  feedbackSilenceTimeout: 30000, // 30 seconds of silence = timeout and reset
  moreQuestionsTimeout: 30000, // 30 seconds to respond before timeout
  // Latency adjustment settings
  latencyBufferMultiplier: 0, // No buffer needed with longer timeouts
  minTimeout: 10000, // Minimum 10 seconds
  maxTimeout: 30000, // Maximum 30 seconds
  messages: {
    moreQuestions: "Is there anything else I can help you with today?",
    readyToHelp: "What else can I help you with?",
    satisfaction: "How was your experience with me today?",
    goodbye: "Thanks for chatting! Feel free to come back anytime during the conference. Have a great day!",
    requestFeedback: "I'd love to hear what you think - what went well or what could be better?",
    thankYou: "Thank you for your feedback! Have a wonderful conference experience!"
  }
};