// Feedback conversation state machine service

import { FeedbackState, FeedbackTransition, FeedbackConfig, DEFAULT_FEEDBACK_CONFIG, FOLLOW_UP_QUESTIONS } from '@/types/feedback.types';
import { latencyTracker } from './latency-tracker.service';

export class FeedbackStateMachine {
  private currentState: FeedbackState = FeedbackState.IDLE;
  private config: FeedbackConfig;
  private transitions: Map<string, FeedbackTransition> = new Map();
  private stateChangeCallbacks: ((newState: FeedbackState, oldState: FeedbackState) => void)[] = [];
  private feedbackWasProvided: boolean = false; // Track if feedback was actually provided
  private questionIndex: number = 0; // Track which follow-up question to use next

  constructor(config: FeedbackConfig = DEFAULT_FEEDBACK_CONFIG) {
    this.config = config;
    this.initializeTransitions();
  }

  private initializeTransitions() {
    // Define all valid state transitions
    const transitions: FeedbackTransition[] = [
      // After answering, user can ask more questions (stay in IDLE) or timeout to satisfaction
      {
        from: FeedbackState.IDLE,
        to: FeedbackState.ASKING_SATISFACTION,
        trigger: 'timeout'
      },
      
      // User says YES to more questions
      {
        from: FeedbackState.ASKING_MORE_QUESTIONS,
        to: FeedbackState.IDLE,
        trigger: 'user_yes'
      },
      
      // User says NO to more questions
      {
        from: FeedbackState.ASKING_MORE_QUESTIONS,
        to: FeedbackState.ASKING_SATISFACTION,
        trigger: 'user_no'
      },
      
      // Timeout on asking more questions - assume user is done, say farewell
      {
        from: FeedbackState.ASKING_MORE_QUESTIONS,
        to: FeedbackState.THANKING_USER,
        trigger: 'timeout'
      },
      
      // User satisfied - thank them and end session
      {
        from: FeedbackState.ASKING_SATISFACTION,
        to: FeedbackState.THANKING_USER,
        trigger: 'user_yes'
      },
      
      // User not satisfied - collect feedback
      {
        from: FeedbackState.ASKING_SATISFACTION,
        to: FeedbackState.COLLECTING_FEEDBACK,
        trigger: 'user_no'
      },
      
      // Timeout on satisfaction question - assume user is satisfied
      {
        from: FeedbackState.ASKING_SATISFACTION,
        to: FeedbackState.THANKING_USER,
        trigger: 'timeout'
      },
      
      // Feedback provided or timeout
      {
        from: FeedbackState.COLLECTING_FEEDBACK,
        to: FeedbackState.THANKING_USER,
        trigger: 'user_response'
      },
      {
        from: FeedbackState.COLLECTING_FEEDBACK,
        to: FeedbackState.THANKING_USER,
        trigger: 'timeout'
      },
      
      // After thanking, reset session
      {
        from: FeedbackState.THANKING_USER,
        to: FeedbackState.RESETTING_SESSION,
        trigger: 'timeout'
      },
      
      // Reset to idle
      {
        from: FeedbackState.RESETTING_SESSION,
        to: FeedbackState.IDLE,
        trigger: 'reset'
      }
    ];

    // Store transitions in map for quick lookup
    transitions.forEach(t => {
      const key = `${t.from}-${t.trigger}`;
      this.transitions.set(key, t);
    });
  }

  getCurrentState(): FeedbackState {
    return this.currentState;
  }

  getConfig(): FeedbackConfig {
    return this.config;
  }

  // Check if feedback was provided in this session
  wasFeedbackProvided(): boolean {
    return this.feedbackWasProvided;
  }

  // Get the appropriate message for current state
  getStateMessage(): string | null {
    console.log('🔍 getStateMessage called for state:', this.currentState);
    switch (this.currentState) {
      case FeedbackState.ASKING_MORE_QUESTIONS:
        // Use cycling follow-up questions for variety
        const question = FOLLOW_UP_QUESTIONS[this.questionIndex % FOLLOW_UP_QUESTIONS.length];
        console.log('📢 Returning follow-up question:', question, `(index: ${this.questionIndex})`);
        // Increment for next time
        this.questionIndex++;
        return question;
      case FeedbackState.ASKING_SATISFACTION:
        console.log('📢 Returning satisfaction message:', this.config.messages.satisfaction);
        return this.config.messages.satisfaction;
      case FeedbackState.COLLECTING_FEEDBACK:
        return this.config.messages.requestFeedback;
      case FeedbackState.THANKING_USER:
        // Return appropriate message based on whether feedback was actually provided
        if (this.feedbackWasProvided) {
          return this.config.messages.thankYou;
        } else {
          return this.config.messages.goodbye;
        }
      case FeedbackState.IDLE:
        // Don't return ready message when user is actively continuing conversation
        // Only return it in specific contexts where we want to indicate readiness
        return null;
      case FeedbackState.RESETTING_SESSION:
        // Don't return a message for RESETTING_SESSION - it's just a processing state
        // The actual farewell message is handled by THANKING_USER or timeout farewell
        return null;
      default:
        return null;
    }
  }

  // Get timeout for current state (with dynamic latency adjustment)
  getStateTimeout(): number | null {
    const config = this.config;
    
    switch (this.currentState) {
      case FeedbackState.ASKING_MORE_QUESTIONS:
        return latencyTracker.calculateDynamicTimeout(
          config.moreQuestionsTimeout,
          config.latencyBufferMultiplier,
          config.minTimeout,
          config.maxTimeout
        );
      case FeedbackState.COLLECTING_FEEDBACK:
        return latencyTracker.calculateDynamicTimeout(
          config.feedbackSilenceTimeout,
          config.latencyBufferMultiplier,
          config.minTimeout,
          config.maxTimeout
        );
      case FeedbackState.THANKING_USER:
        return 2000; // Fixed 2 seconds before reset (no latency adjustment needed)
      default:
        return null;
    }
  }

  // Check if a transition is valid
  canTransition(trigger: FeedbackTransition['trigger']): boolean {
    const key = `${this.currentState}-${trigger}`;
    return this.transitions.has(key);
  }

  // Perform state transition
  transition(trigger: FeedbackTransition['trigger']): boolean {
    const key = `${this.currentState}-${trigger}`;
    const transition = this.transitions.get(key);
    
    console.log(`🔄 Attempting transition: ${key}`);

    if (!transition) {
      console.warn(`Invalid transition: ${key}`);
      return false;
    }

    const oldState = this.currentState;
    const newState = transition.to;
    
    // Log detailed transition info
    console.log(`🔀 TRANSITION DETAILS:`, {
      from: oldState,
      to: newState,
      trigger: trigger,
      key: key
    });
    
    this.currentState = newState;
    console.log(`✅ Transition successful: ${oldState} -> ${this.currentState}`);

    // Track if feedback was actually provided
    if (oldState === FeedbackState.COLLECTING_FEEDBACK && trigger === 'user_response') {
      this.feedbackWasProvided = true;
      console.log('✅ Feedback was provided by user during COLLECTING_FEEDBACK');
    }

    console.log(`🚨 FEEDBACK STATE TRANSITION: ${oldState} -> ${this.currentState} (trigger: ${trigger})`);
    
    // Add guard to verify we're in the expected state
    if (oldState === FeedbackState.IDLE && trigger === 'user_response' && newState !== FeedbackState.ASKING_MORE_QUESTIONS) {
      console.error(`❌ UNEXPECTED TRANSITION: Expected IDLE -> ASKING_MORE_QUESTIONS but got ${newState}`);
    }

    // Notify callbacks
    this.stateChangeCallbacks.forEach(cb => cb(this.currentState, oldState));

    return true;
  }

  // Subscribe to state changes
  onStateChange(callback: (newState: FeedbackState, oldState: FeedbackState) => void) {
    this.stateChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  // Reset state machine
  reset() {
    const oldState = this.currentState;
    this.currentState = FeedbackState.IDLE;
    this.feedbackWasProvided = false; // Reset feedback tracking
    this.questionIndex = 0; // Reset question cycling
    console.log(`🔄 Feedback state machine reset: ${oldState} -> IDLE`);
    console.trace('Reset called from:');
  }

  // Explicitly mark that feedback was provided
  setFeedbackProvided(provided: boolean) {
    this.feedbackWasProvided = provided;
    console.log(`📝 Feedback provided status set to: ${provided}`);
  }

  // Helper to determine user intent from text
  static detectUserIntent(text: string): 'yes' | 'no' | 'other' {
    const lowerText = text.toLowerCase().trim();
    console.log(`🔍 Intent detection for: "${lowerText}"`);
    
    // Use word boundaries to avoid false matches (like "no" in "keynote")
    const createWordBoundaryRegex = (word: string) => new RegExp(`\\b${word}\\b`, 'i');
    
    // Common yes responses - check for exact word matches
    const yesPatterns = [
      'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 
      'absolutely', 'definitely', 'of course', 'please', 'yup'
    ];
    
    // Common no responses - check for exact word matches
    const noPatterns = [
      'no', 'nope', 'negative', 'nah', 'wrong', 'incorrect', 
      'stop', 'enough', 'done', 'finished'
    ];
    
    // IMPORTANT: If yes/no is followed by additional content (like a question), treat it as 'other'
    // This handles cases like "yes can you tell me about..." or "no but what about..."
    const hasAdditionalContent = (pattern: string): boolean => {
      const regex = new RegExp(`^${pattern}\\s+.{10,}`, 'i'); // Pattern followed by 10+ chars
      return regex.test(lowerText);
    };
    
    // Check for yes - use word boundaries
    const yesMatch = yesPatterns.find(pattern => createWordBoundaryRegex(pattern).test(lowerText));
    if (yesMatch) {
      // Check if there's additional content after the yes (a question)
      if (hasAdditionalContent(yesMatch)) {
        console.log(`❓ Intent: OTHER (yes followed by question: "${lowerText}")`);
        return 'other';
      }
      console.log(`✅ Intent: YES (matched pattern: "${yesMatch}")`);
      return 'yes';
    }
    
    // Check for no - use word boundaries
    const noMatch = noPatterns.find(pattern => createWordBoundaryRegex(pattern).test(lowerText));
    if (noMatch) {
      // Check if there's additional content after the no (a question)
      if (hasAdditionalContent(noMatch)) {
        console.log(`❓ Intent: OTHER (no followed by question: "${lowerText}")`);
        return 'other';
      }
      console.log(`❌ Intent: NO (matched pattern: "${noMatch}")`);
      return 'no';
    }
    
    // Special case: if text starts with "no " followed by more than a few words, it might be a question
    if (lowerText === 'no' || (lowerText.startsWith('no ') && lowerText.split(' ').length <= 3)) {
      console.log(`❌ Intent: NO (starts with "no")`);
      return 'no';
    }
    
    console.log(`❓ Intent: OTHER (no patterns matched)`);
    return 'other';
  }
}

// Export singleton instance
export const feedbackStateMachine = new FeedbackStateMachine();