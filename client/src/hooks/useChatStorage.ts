// hooks/useChat.ts - UPDATED to work with your AI Router API
import { useState, useRef, useCallback } from 'react';
import { CacheService } from '@/services/cache.service';
import { ChatStorageService } from '@/lib/supabase/chatStorage';
import { Strategy } from '@/types/ai-router.types'; // Import your existing Strategy type

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
  isIntroMessage?: boolean;
}

interface UseChatProps {
  sessionId: string | null;
  onClose: () => void;
}

export const useChat = ({ sessionId, onClose }: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTypingText, setCurrentTypingText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize chat with Harper's intro message
  const initializeChat = useCallback(async () => {
    if (!sessionId) {
      console.log('❌ No session ID provided for chat initialization');
      return;
    }

    try {
      console.log('🎯 Initializing chat for session:', sessionId);
      
      const introMessage: Message = {
        id: `intro-${Date.now()}`,
        text: "Hi! I'm Harper, your conference assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
        isIntroMessage: true
      };

      setMessages([introMessage]);

      // Save intro message to database
      try {
        await ChatStorageService.saveMessage({
          sessionId,
          message: introMessage.text,
          isUser: false,
          messageId: introMessage.id,
          metadata: { isIntroMessage: true }
        });
        console.log('💾 Intro message saved to database');
      } catch (error) {
        console.warn('⚠️ Failed to save intro message:', error);
      }

    } catch (error) {
      console.error('❌ Error initializing chat:', error);
    }
  }, [sessionId]);

  // Determine the best strategy based on message content
  const getOptimalStrategy = (text: string): Strategy => {
    const lowerText = text.toLowerCase();
    
    // Simple questions get cheap strategy
    if (lowerText.includes('time') || lowerText.includes('when') || lowerText.includes('where') || 
        lowerText.includes('who') || lowerText.length < 50) {
      return 'cheap';
    }
    
    // Complex questions get quality strategy
    if (lowerText.includes('explain') || lowerText.includes('how') || lowerText.includes('why') ||
        lowerText.includes('detail') || lowerText.length > 200) {
      return 'quality';
    }
    
    // Default to balanced
    return 'balanced';
  };

  // Send a message and get AI response
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionId) {
      console.log('❌ Cannot send message: missing text or session ID');
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    console.log('📤 User message:', userMessage.text);
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message to database immediately
      await ChatStorageService.saveMessage({
        sessionId,
        message: userMessage.text,
        isUser: true,
        messageId: userMessage.id
      });
      console.log('💾 User message saved to database');

      // Save question to recent questions with category
      const category = categorizeQuestion(text);
      await ChatStorageService.saveRecentQuestion({
        sessionId,
        question: text,
        category,
        timestamp: new Date().toISOString()
      });
      console.log(`📊 Question saved with category: ${category}`);

    } catch (error) {
      console.warn('⚠️ Failed to save user message:', error);
    }

    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Determine optimal strategy for this question
      const strategy = getOptimalStrategy(text);
      console.log(`🎯 Using strategy: ${strategy} for question: "${text.substring(0, 50)}..."`);

      // Call your AI Router API
      const response = await fetch('/api/ai-router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text,
          strategy: strategy
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`AI Router API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('No response from AI Router');
      }

      console.log(`✅ AI Router response received from ${data.provider} (${data.responseTime}ms, $${data.cost?.toFixed(4) || '0'})`);

      // Log optimization details if available
      if (data.optimizations) {
        console.log(`🚀 Optimizations used: ${data.optimizations.join(', ')}`);
      }
      if (data.cached) {
        console.log(`💾 Response was cached (${data.cacheAge ? `${data.cacheAge}s old` : 'instant'})`);
      }

      // Create AI message
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        isTyping: true
      };

      setMessages(prev => [...prev, aiMessage]);

      // Simulate typing effect
      await simulateTyping(aiMessage.text, aiMessage.id);

      // Save AI message to database with metadata
      try {
        await ChatStorageService.saveMessage({
          sessionId,
          message: aiMessage.text,
          isUser: false,
          messageId: aiMessage.id,
          metadata: {
            provider: data.provider,
            strategy: strategy,
            cost: data.cost,
            responseTime: data.responseTime,
            tokensUsed: data.tokensUsed,
            cached: data.cached,
            optimizations: data.optimizations
          }
        });
        console.log('💾 AI message saved to database with metadata');
      } catch (error) {
        console.warn('⚠️ Failed to save AI message:', error);
      }

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      
      if (error.name === 'AbortError') {
        console.log('🚫 Request was cancelled');
        return;
      }

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, sessionId]);

  // Simulate typing effect
  const simulateTyping = useCallback(async (text: string, messageId: string) => {
    const typingSpeed = 30; // ms per character
    
    for (let i = 0; i <= text.length; i++) {
      const partialText = text.substring(0, i);
      setCurrentTypingText(partialText);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: partialText, isTyping: i < text.length }
            : msg
        )
      );
      
      if (i < text.length) {
        await new Promise(resolve => setTimeout(resolve, typingSpeed));
      }
    }
    
    setCurrentTypingText('');
  }, []);

  // Categorize questions for analytics
  const categorizeQuestion = (question: string): string => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('speaker') || lowerQuestion.includes('who is') || lowerQuestion.includes('presenter')) {
      return 'speakers';
    } else if (lowerQuestion.includes('schedule') || lowerQuestion.includes('time') || lowerQuestion.includes('when')) {
      return 'schedule';
    } else if (lowerQuestion.includes('where') || lowerQuestion.includes('location') || lowerQuestion.includes('room')) {
      return 'location';
    } else if (lowerQuestion.includes('food') || lowerQuestion.includes('lunch') || lowerQuestion.includes('dinner') || lowerQuestion.includes('break')) {
      return 'food';
    } else if (lowerQuestion.includes('wifi') || lowerQuestion.includes('internet') || lowerQuestion.includes('password')) {
      return 'technical';
    } else if (lowerQuestion.includes('register') || lowerQuestion.includes('sign up') || lowerQuestion.includes('ticket')) {
      return 'registration';
    } else if (lowerQuestion.includes('parking') || lowerQuestion.includes('hotel') || lowerQuestion.includes('transport')) {
      return 'logistics';
    } else {
      return 'general';
    }
  };

  // Handle voice input
  const handleVoiceInput = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    console.log('🎤 Voice input received:', transcript);

    // Log voice input analytics
    try {
      await ChatStorageService.logVoiceInput({
        sessionId: sessionId || 'unknown',
        transcript,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.warn('⚠️ Failed to log voice input:', error);
    }

    // Send as regular message
    await sendMessage(transcript);
  }, [sessionId, sendMessage]);

  return {
    messages,
    isLoading,
    currentTypingText,
    sendMessage,
    handleVoiceInput,
    initializeChat
  };
};

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

export const useChatStorage = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  const startNewSession = useCallback(async (options?: {
    source?: string;
    initial_query?: string | null;
    timestamp?: string;
  }) => {
    try {
      console.log('🆕 Creating new chat session with options:', options);
      
      const metadata = {
        source: options?.source || 'manual',
        initial_query: options?.initial_query,
        timestamp: options?.timestamp || new Date().toISOString(),
      };

      const newSession = await ChatStorageService.createChatSession(metadata);
      
      if (newSession) {
        console.log('✅ New session created:', newSession.id);
        setCurrentSession(newSession);
        return newSession;
      } else {
        console.error('❌ Failed to create session');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating session:', error);
      return null;
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      console.log('📂 Loading session:', sessionId);
      // This would load an existing session - implement as needed
      return null;
    } catch (error) {
      console.error('❌ Error loading session:', error);
      return null;
    }
  }, []);

  const endSession = useCallback(async () => {
    if (currentSession?.id) {
      try {
        console.log('🔚 Ending session:', currentSession.id);
        await ChatStorageService.endChatSession(currentSession.id);
        setCurrentSession(null);
      } catch (error) {
        console.error('❌ Error ending session:', error);
      }
    }
  }, [currentSession?.id]);

  const logEvent = useCallback(async (eventType: string, eventData?: Record<string, any>) => {
    if (currentSession?.id) {
      try {
        await ChatStorageService.logAnalyticsEvent(currentSession.id, eventType, eventData);
        console.log('📊 Event logged:', eventType, eventData);
      } catch (error) {
        console.error('❌ Error logging event:', error);
      }
    }
  }, [currentSession?.id]);

  return {
    currentSession,
    startNewSession,
    loadSession,
    endSession,
    logEvent,
  };
};