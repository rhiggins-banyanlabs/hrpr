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

// Array of varied follow-up questions to cycle through
export const FOLLOW_UP_QUESTIONS = [
  "Do you have any more questions for me?",
  "Is there anything else I can help you with?",
  "Need help with anything else before we wrap up?",
  "Got anything else you need a hand with?",
  "What else can I help you with today?",
  "Anything else on your mind about the conference?",
  "Is there something else I can assist you with?",
  "Any other questions I can answer for you?"
];

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
  initialSilenceTimeout: 5000, // 5 seconds to account for API latency
  feedbackSilenceTimeout: 15000, // 15 seconds for feedback collection
  moreQuestionsTimeout: 20000, // 20 seconds to allow for more natural conversation and API latency
  // Latency adjustment settings
  latencyBufferMultiplier: 0, // No buffer needed with longer timeouts
  minTimeout: 5000, // Minimum 5 seconds
  maxTimeout: 20000, // Maximum 20 seconds
  messages: {
    moreQuestions: "Do you have any more questions for me?", // This will be overridden by cycling questions
    readyToHelp: "I am ready to answer all your conference needs!",
    satisfaction: "How was your experience with me today? I'd love to hear your feedback!",
    goodbye: "Thank you for your feedback! Please feel free to come ask me any questions you may have throughout the ACA conference. Have a great day!",
    requestFeedback: "Could you share what went well or what could be improved? All feedback - positive or negative - helps me serve you better!",
    thankYou: "Thank you for your feedback. I hope you have a wonderful conference experience!"
  }
};