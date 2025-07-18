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
  initialSilenceTimeout: 5000, // 5 seconds base timeout
  feedbackSilenceTimeout: 15000, // 15 seconds for feedback collection
  moreQuestionsTimeout: 20000, // 20 seconds base timeout
  // Latency adjustment settings
  latencyBufferMultiplier: 1.5, // Add 50% buffer on top of measured latency
  minTimeout: 3000, // Minimum 3 seconds regardless of latency
  maxTimeout: 30000, // Maximum 30 seconds to prevent excessive waits
  messages: {
    moreQuestions: "Do you have any more questions for me?",
    readyToHelp: "I am ready to answer all your conference needs!",
    satisfaction: "Did I answer your inquiries to your satisfaction?",
    goodbye: "Please feel free to come ask me any questions you may have throughout the AIDA conference. Have a great day!",
    requestFeedback: "Please provide feedback to help me assist you better in the future.",
    thankYou: "Thank you for your feedback. I hope you have a wonderful conference experience!"
  }
};