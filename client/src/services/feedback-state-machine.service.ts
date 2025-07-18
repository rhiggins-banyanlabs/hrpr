// Feedback conversation state machine service

import { FeedbackState, FeedbackTransition, FeedbackConfig, DEFAULT_FEEDBACK_CONFIG } from '@/types/feedback.types';

export class FeedbackStateMachine {
  private currentState: FeedbackState = FeedbackState.IDLE;
  private config: FeedbackConfig;
  private transitions: Map<string, FeedbackTransition> = new Map();
  private stateChangeCallbacks: ((newState: FeedbackState, oldState: FeedbackState) => void)[] = [];
  private feedbackWasProvided: boolean = false; // Track if feedback was actually provided

  constructor(config: FeedbackConfig = DEFAULT_FEEDBACK_CONFIG) {
    this.config = config;
    this.initializeTransitions();
  }

  private initializeTransitions() {
    // Define all valid state transitions
    const transitions: FeedbackTransition[] = [
      // After answering, wait for silence then ask if more questions
      {
        from: FeedbackState.IDLE,
        to: FeedbackState.WAITING_FOR_SILENCE,
        trigger: 'user_response'
      },
      {
        from: FeedbackState.WAITING_FOR_SILENCE,
        to: FeedbackState.ASKING_MORE_QUESTIONS,
        trigger: 'silence'
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
    switch (this.currentState) {
      case FeedbackState.ASKING_MORE_QUESTIONS:
        return this.config.messages.moreQuestions;
      case FeedbackState.ASKING_SATISFACTION:
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
        // Special case - return ready message when transitioning back to IDLE from questions
        return this.config.messages.readyToHelp;
      case FeedbackState.RESETTING_SESSION:
        // Don't return a message for RESETTING_SESSION - it's just a processing state
        // The actual farewell message is handled by THANKING_USER or timeout farewell
        return null;
      default:
        return null;
    }
  }

  // Get timeout for current state
  getStateTimeout(): number | null {
    switch (this.currentState) {
      case FeedbackState.WAITING_FOR_SILENCE:
        return this.config.initialSilenceTimeout;
      case FeedbackState.ASKING_MORE_QUESTIONS:
        return this.config.moreQuestionsTimeout;
      case FeedbackState.COLLECTING_FEEDBACK:
        return this.config.feedbackSilenceTimeout;
      case FeedbackState.THANKING_USER:
        return 2000; // 2 seconds before reset
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

    if (!transition) {
      console.warn(`Invalid transition: ${key}`);
      return false;
    }

    const oldState = this.currentState;
    this.currentState = transition.to;

    // Track if feedback was actually provided
    if (oldState === FeedbackState.COLLECTING_FEEDBACK && trigger === 'user_response') {
      this.feedbackWasProvided = true;
      console.log('✅ Feedback was provided by user');
    }

    console.log(`Feedback state transition: ${oldState} -> ${this.currentState} (trigger: ${trigger})`);

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
    this.currentState = FeedbackState.IDLE;
    this.feedbackWasProvided = false; // Reset feedback tracking
    console.log('Feedback state machine reset to IDLE');
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
    
    // Check for yes - use word boundaries
    const yesMatch = yesPatterns.find(pattern => createWordBoundaryRegex(pattern).test(lowerText));
    if (yesMatch) {
      console.log(`✅ Intent: YES (matched pattern: "${yesMatch}")`);
      return 'yes';
    }
    
    // Check for no - use word boundaries
    const noMatch = noPatterns.find(pattern => createWordBoundaryRegex(pattern).test(lowerText));
    if (noMatch) {
      console.log(`❌ Intent: NO (matched pattern: "${noMatch}")`);
      return 'no';
    }
    
    // Special case: if text starts with "no " or is exactly "no", it's a no
    if (lowerText === 'no' || lowerText.startsWith('no ')) {
      console.log(`❌ Intent: NO (starts with "no")`);
      return 'no';
    }
    
    console.log(`❓ Intent: OTHER (no patterns matched)`);
    return 'other';
  }
}

// Export singleton instance
export const feedbackStateMachine = new FeedbackStateMachine();