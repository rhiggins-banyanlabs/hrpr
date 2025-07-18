// Test file for feedback flow functionality

import { FeedbackStateMachine } from '../services/feedback-state-machine.service';
import { FeedbackState } from '../types/feedback.types';
import { createSilenceDetector } from '../services/silence-detection.service';

describe('Feedback Flow System', () => {
  let stateMachine: FeedbackStateMachine;

  beforeEach(() => {
    stateMachine = new FeedbackStateMachine();
  });

  describe('State Machine', () => {
    test('should initialize in IDLE state', () => {
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.IDLE);
    });

    test('should transition from IDLE to WAITING_FOR_SILENCE on user response', () => {
      const result = stateMachine.transition('user_response');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.WAITING_FOR_SILENCE);
    });

    test('should transition from WAITING_FOR_SILENCE to ASKING_MORE_QUESTIONS on silence', () => {
      stateMachine.transition('user_response'); // Go to WAITING_FOR_SILENCE
      const result = stateMachine.transition('silence');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.ASKING_MORE_QUESTIONS);
    });

    test('should handle YES response to more questions', () => {
      // Navigate to ASKING_MORE_QUESTIONS state
      stateMachine.transition('user_response');
      stateMachine.transition('silence');
      
      const result = stateMachine.transition('user_yes');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.IDLE);
    });

    test('should handle NO response to more questions', () => {
      // Navigate to ASKING_MORE_QUESTIONS state
      stateMachine.transition('user_response');
      stateMachine.transition('silence');
      
      const result = stateMachine.transition('user_no');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.ASKING_SATISFACTION);
    });

    test('should handle satisfaction responses', () => {
      // Navigate to ASKING_SATISFACTION state
      stateMachine.transition('user_response');
      stateMachine.transition('silence');
      stateMachine.transition('user_no');
      
      // Test satisfied response
      const satisfiedResult = stateMachine.transition('user_yes');
      expect(satisfiedResult).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.RESETTING_SESSION);
    });

    test('should handle unsatisfied response', () => {
      // Navigate to ASKING_SATISFACTION state
      stateMachine.transition('user_response');
      stateMachine.transition('silence');
      stateMachine.transition('user_no');
      
      // Test unsatisfied response
      const result = stateMachine.transition('user_no');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.COLLECTING_FEEDBACK);
    });

    test('should handle timeout on asking more questions', () => {
      // Navigate to ASKING_MORE_QUESTIONS state
      stateMachine.transition('user_response');
      stateMachine.transition('silence');
      
      // Test timeout - should go to RESETTING_SESSION (farewell)
      const result = stateMachine.transition('timeout');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.RESETTING_SESSION);
    });

    test('should reject invalid transitions', () => {
      // Try invalid transition from IDLE
      const result = stateMachine.transition('user_yes');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.IDLE);
    });

    test('should reset properly', () => {
      // Navigate to some state
      stateMachine.transition('user_response');
      stateMachine.transition('silence');
      
      // Reset
      stateMachine.reset();
      expect(stateMachine.getCurrentState()).toBe(FeedbackState.IDLE);
    });
  });

  describe('Intent Detection', () => {
    test('should detect YES responses', () => {
      const yesResponses = ['yes', 'yeah', 'yep', 'sure', 'okay', 'absolutely'];
      
      yesResponses.forEach(response => {
        const intent = FeedbackStateMachine.detectUserIntent(response);
        expect(intent).toBe('yes');
      });
    });

    test('should detect NO responses', () => {
      const noResponses = ['no', 'nope', 'not really', 'negative', 'nah'];
      
      noResponses.forEach(response => {
        const intent = FeedbackStateMachine.detectUserIntent(response);
        expect(intent).toBe('no');
      });
    });

    test('should handle ambiguous responses', () => {
      const ambiguousResponses = ['maybe', 'I think so', 'kind of', 'hello'];
      
      ambiguousResponses.forEach(response => {
        const intent = FeedbackStateMachine.detectUserIntent(response);
        expect(intent).toBe('other');
      });
    });

    test('should be case insensitive', () => {
      expect(FeedbackStateMachine.detectUserIntent('YES')).toBe('yes');
      expect(FeedbackStateMachine.detectUserIntent('NO')).toBe('no');
      expect(FeedbackStateMachine.detectUserIntent('YeS')).toBe('yes');
    });
  });

  describe('State Messages', () => {
    test('should return correct message for each state', () => {
      const config = stateMachine.getConfig();
      
      // Test ASKING_MORE_QUESTIONS
      stateMachine.transition('user_response');
      stateMachine.transition('silence');
      expect(stateMachine.getStateMessage()).toBe(config.messages.moreQuestions);
      
      // Test ASKING_SATISFACTION
      stateMachine.transition('user_no');
      expect(stateMachine.getStateMessage()).toBe(config.messages.satisfaction);
      
      // Test COLLECTING_FEEDBACK
      stateMachine.transition('user_no');
      expect(stateMachine.getStateMessage()).toBe(config.messages.requestFeedback);
    });
  });

  describe('Silence Detection', () => {
    test('should create silence detector with correct timeout', () => {
      let silenceDetected = false;
      
      const detector = createSilenceDetector(
        100, // 100ms timeout
        () => { silenceDetected = true; }
      );
      
      expect(detector).toBeDefined();
      expect(detector.getTimeSinceLastActivity()).toBeLessThan(50);
    });

    test('should detect silence after timeout', (done) => {
      let silenceDetected = false;
      
      const detector = createSilenceDetector(
        50, // 50ms timeout
        () => { 
          silenceDetected = true;
          expect(silenceDetected).toBe(true);
          detector.destroy();
          done();
        }
      );
      
      detector.start();
    });

    test('should reset timer on activity', (done) => {
      let silenceDetected = false;
      
      const detector = createSilenceDetector(
        100, // 100ms timeout
        () => { silenceDetected = true; }
      );
      
      detector.start();
      
      // Record activity after 50ms
      setTimeout(() => {
        detector.recordActivity();
        expect(silenceDetected).toBe(false);
      }, 50);
      
      // Check that silence wasn't detected after 80ms (would have been without activity)
      setTimeout(() => {
        expect(silenceDetected).toBe(false);
        detector.destroy();
        done();
      }, 80);
    });
  });

  describe('Configuration', () => {
    test('should use default timeouts', () => {
      const config = stateMachine.getConfig();
      expect(config.initialSilenceTimeout).toBe(3000);
      expect(config.feedbackSilenceTimeout).toBe(5000);
      expect(config.moreQuestionsTimeout).toBe(5000);
    });

    test('should return correct state timeout', () => {
      // IDLE state
      expect(stateMachine.getStateTimeout()).toBe(null);
      
      // WAITING_FOR_SILENCE state
      stateMachine.transition('user_response');
      expect(stateMachine.getStateTimeout()).toBe(3000);
      
      // ASKING_MORE_QUESTIONS state
      stateMachine.transition('silence');
      expect(stateMachine.getStateTimeout()).toBe(5000);
      
      // COLLECTING_FEEDBACK state
      stateMachine.transition('user_no');
      stateMachine.transition('user_no');
      expect(stateMachine.getStateTimeout()).toBe(5000);
    });
  });
});

// Integration test for complete flow
describe('Complete Feedback Flow Integration', () => {
  test('should complete satisfied user flow', () => {
    const stateMachine = new FeedbackStateMachine();
    const states: FeedbackState[] = [];
    
    // Track state changes
    stateMachine.onStateChange((newState) => {
      states.push(newState);
    });
    
    // Simulate complete satisfied flow
    stateMachine.transition('user_response');     // -> WAITING_FOR_SILENCE
    stateMachine.transition('silence');           // -> ASKING_MORE_QUESTIONS
    stateMachine.transition('user_no');           // -> ASKING_SATISFACTION
    stateMachine.transition('user_yes');          // -> RESETTING_SESSION
    
    expect(states).toEqual([
      FeedbackState.WAITING_FOR_SILENCE,
      FeedbackState.ASKING_MORE_QUESTIONS,
      FeedbackState.ASKING_SATISFACTION,
      FeedbackState.RESETTING_SESSION
    ]);
  });

  test('should complete unsatisfied user flow', () => {
    const stateMachine = new FeedbackStateMachine();
    const states: FeedbackState[] = [];
    
    // Track state changes
    stateMachine.onStateChange((newState) => {
      states.push(newState);
    });
    
    // Simulate complete unsatisfied flow
    stateMachine.transition('user_response');     // -> WAITING_FOR_SILENCE
    stateMachine.transition('silence');           // -> ASKING_MORE_QUESTIONS
    stateMachine.transition('user_no');           // -> ASKING_SATISFACTION
    stateMachine.transition('user_no');           // -> COLLECTING_FEEDBACK
    stateMachine.transition('user_response');     // -> THANKING_USER
    
    expect(states).toEqual([
      FeedbackState.WAITING_FOR_SILENCE,
      FeedbackState.ASKING_MORE_QUESTIONS,
      FeedbackState.ASKING_SATISFACTION,
      FeedbackState.COLLECTING_FEEDBACK,
      FeedbackState.THANKING_USER
    ]);
  });

  test('should handle user wanting more questions', () => {
    const stateMachine = new FeedbackStateMachine();
    const states: FeedbackState[] = [];
    
    // Track state changes
    stateMachine.onStateChange((newState) => {
      states.push(newState);
    });
    
    // Simulate user wanting more questions
    stateMachine.transition('user_response');     // -> WAITING_FOR_SILENCE
    stateMachine.transition('silence');           // -> ASKING_MORE_QUESTIONS
    stateMachine.transition('user_yes');          // -> IDLE (ready for more questions)
    
    expect(states).toEqual([
      FeedbackState.WAITING_FOR_SILENCE,
      FeedbackState.ASKING_MORE_QUESTIONS,
      FeedbackState.IDLE
    ]);
  });

  test('should handle timeout on more questions (user walks away)', () => {
    const stateMachine = new FeedbackStateMachine();
    const states: FeedbackState[] = [];
    
    // Track state changes
    stateMachine.onStateChange((newState) => {
      states.push(newState);
    });
    
    // Simulate user timeout after asking more questions
    stateMachine.transition('user_response');     // -> WAITING_FOR_SILENCE
    stateMachine.transition('silence');           // -> ASKING_MORE_QUESTIONS
    stateMachine.transition('timeout');           // -> RESETTING_SESSION (farewell)
    
    expect(states).toEqual([
      FeedbackState.WAITING_FOR_SILENCE,
      FeedbackState.ASKING_MORE_QUESTIONS,
      FeedbackState.RESETTING_SESSION
    ]);
  });
});