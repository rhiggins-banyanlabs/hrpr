// hooks/useChat.ts - COMBINED VERSION with typing effects and AI Router
import { useState, useRef, useCallback } from 'react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';
import { Strategy } from '@/types/ai-router.types';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'connie';
  timestamp: Date;
  isTyping?: boolean;
  isIntroMessage?: boolean;
  isTemporary?: boolean;
  isVoiceTranscription?: boolean;
}

interface UseChatProps {
  // Enhanced props (from first hook)
  speakText?: (text: string) => Promise<any>;
  unlockAudio?: () => Promise<void>;
  selectedVoice?: string;
  
  // AI Router props (from second hook)
  sessionId: string | null;
  onClose?: () => void;
}

export const useChat = ({ 
  speakText, 
  unlockAudio,
  selectedVoice,
  sessionId,
  onClose
}: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [typingBotMsg, setTypingBotMsg] = useState<string | null>(null);
  const [currentTypingText, setCurrentTypingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isProcessingRef = useRef(false);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  console.log('🏠 useChat render - messages:', messages.length, 'sessionId:', sessionId);

  // Categorize questions for analytics
  const categorizeQuestion = (question: string): string => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('speaker') || lowerQ.includes('presenter') || lowerQ.includes('who is')) return 'speakers';
    if (lowerQ.includes('time') || lowerQ.includes('when') || lowerQ.includes('schedule')) return 'schedule';
    if (lowerQ.includes('location') || lowerQ.includes('where') || lowerQ.includes('room')) return 'location';
    if (lowerQ.includes('food') || lowerQ.includes('lunch') || lowerQ.includes('eat')) return 'food';
    if (lowerQ.includes('networking') || lowerQ.includes('break')) return 'networking';
    if (lowerQ.includes('wifi') || lowerQ.includes('internet') || lowerQ.includes('password')) return 'technical';
    if (lowerQ.includes('register') || lowerQ.includes('sign up') || lowerQ.includes('ticket')) return 'registration';
    if (lowerQ.includes('parking') || lowerQ.includes('hotel') || lowerQ.includes('transport')) return 'logistics';
    
    return 'general';
  };

  // Cache user questions for admin analytics
  const cacheUserQuestion = async (question: string) => {
    if (!sessionId) return;
    
    try {
      await ChatStorageService.logAnalyticsEvent(sessionId, 'user_question', {
        question: question.trim(),
        category: categorizeQuestion(question),
        timestamp: new Date().toISOString()
      });
      console.log('📊 User question cached for analytics');
    } catch (error) {
      console.error('❌ Error caching user question:', error);
    }
  };

  // Determine optimal AI strategy based on message content
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

  // Enhanced typing effect with voice support
  const showTypingEffect = async (text: string, withVoice: boolean = false) => {
    console.log('🔤 Starting typing effect for:', text.substring(0, 30));
    console.log('🔤 withVoice:', withVoice, 'speakText available:', !!speakText);
    
    if (withVoice && speakText) {
      console.log('🔊 Starting voice and showing thinking dots...');
      
      setIsBotThinking(true);
      setIsBotTyping(false);
      setTypingBotMsg(null);
      
      try {
        const voiceResult = await speakText(text);
        console.log('🔊 Voice result received:', !!voiceResult, 'audio:', !!voiceResult?.audio);
        
        setIsBotThinking(false);
        setIsBotTyping(true);
        setTypingBotMsg('');
        
        if (voiceResult && voiceResult.audio) {
          await new Promise<void>((resolve) => {
            const audio = voiceResult.audio;
            
            const onPlay = () => {
              console.log('🎵 Audio is now playing - typing synchronized!');
              audio.removeEventListener('play', onPlay);
              resolve();
            };
            
            audio.addEventListener('play', onPlay);
            
            setTimeout(() => {
              console.log('⏰ Fallback timeout - starting typing anyway');
              audio.removeEventListener('play', onPlay);
              resolve();
            }, 100);
          });
        }
      } catch (voiceError) {
        console.error('🔊 Voice error:', voiceError);
        setIsBotThinking(false);
        setIsBotTyping(true);
        setTypingBotMsg('');
      }
    } else {
      console.log('🔤 No voice, just typing effect');
      setIsBotTyping(true);
      setTypingBotMsg('');
    }
    
    return new Promise<void>((resolve) => {
      let currentText = '';
      let charIndex = 0;
      const charDelay = 50;
      
      console.log('🔤 Starting character-by-character typing...');
      
      const typeNextChar = () => {
        if (charIndex < text.length && mountedRef.current) {
          currentText += text[charIndex];
          console.log('🔤 Typing character:', text[charIndex]);
          setTypingBotMsg(currentText);
          setCurrentTypingText(currentText);
          charIndex++;
          setTimeout(typeNextChar, charDelay);
        } else {
          console.log('✅ Typing effect completed');
          if (mountedRef.current) {
            setIsBotTyping(false);
            setTypingBotMsg(null);
            setCurrentTypingText('');
          }
          resolve();
        }
      };
      
      typeNextChar();
    });
  };

  // Initialize chat with Connie's intro message
  const initializeChat = useCallback(async () => {
    if (!sessionId) {
      console.log('❌ No session ID provided for chat initialization');
      return;
    }

    try {
      console.log('🎯 Initializing chat for session:', sessionId);
      
      const introMessage: Message = {
        id: `intro-${Date.now()}`,
        text: "Hi! I'm Connie, your conference assistant. I can help you with speaker information, session schedules, locations, and any other conference questions you might have. How can I help you today?",
        sender: 'connie',
        timestamp: new Date(),
        isIntroMessage: true
      };

      setMessages([introMessage]);

      // Save intro message to database
      try {
        await ChatStorageService.saveMessage(
          sessionId,
          'connie',
          introMessage.text,
          {
            metadata: { isIntroMessage: true, messageId: introMessage.id }
          }
        );
        console.log('💾 Intro message saved to database');
      } catch (error) {
        console.warn('⚠️ Failed to save intro message:', error);
      }

    } catch (error) {
      console.error('❌ Error initializing chat:', error);
    }
  }, [sessionId]);

  // COMBINED sendMessage with typing effects AND AI Router
  const sendMessage = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    console.log('📨 ===== SEND MESSAGE STARTED =====');
    console.log('📨 Message text:', text);
    console.log('📨 Session ID:', sessionId);
    console.log('📨 Is voice input:', isVoiceInput);
    
    if (isProcessingRef.current || !text.trim() || !sessionId) {
      console.log('⏹️ Skipping - already processing, empty text, or no session');
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    isProcessingRef.current = true;
    setIsLoading(true);
    
    if (unlockAudio) {
      await unlockAudio();
    }

    try {
      // Cache the user question for analytics
      await cacheUserQuestion(text.trim());

      // Create user message for UI
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      // Add user message to UI immediately
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Save user message to database
      console.log('💾 Saving user message to database...');
      try {
        await ChatStorageService.saveMessage(
          sessionId,
          'user',
          userMessage.text,
          {
            isVoiceInput,
            metadata: {
              timestamp: new Date().toISOString(),
              messageId: userMessage.id,
              category: categorizeQuestion(text.trim())
            }
          }
        );
        console.log('✅ User message saved to database');
      } catch (saveError) {
        console.error('❌ Error saving user message:', saveError);
      }

      // Show thinking dots
      setIsBotThinking(true);

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Determine optimal strategy for this question
      const strategy = getOptimalStrategy(text);
      console.log(`🎯 Using strategy: ${strategy} for question: "${text.substring(0, 50)}..."`);

      // Call AI Router API
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

      // Show typing effect with voice (enhanced version)
      await showTypingEffect(data.response, true);

      // Create bot message for UI
      const botMessage: Message = {
        id: `connie-${Date.now()}`,
        sender: "connie",
        text: data.response,
        timestamp: new Date(),
      };

      // Add bot message to UI
      setMessages(prevMessages => [...prevMessages, botMessage]);

      // Save bot message to database with metadata
      console.log('💾 Saving bot message to database...');
      try {
        await ChatStorageService.saveMessage(
          sessionId,
          'connie',
          botMessage.text,
          {
            selectedVoice,
            metadata: {
              timestamp: new Date().toISOString(),
              messageId: botMessage.id,
              provider: data.provider,
              strategy: strategy,
              cost: data.cost,
              responseTime: data.responseTime,
              tokensUsed: data.tokensUsed,
              cached: data.cached,
              optimizations: data.optimizations,
              questionCategory: categorizeQuestion(text.trim()),
              hasConferenceData: true
            }
          }
        );
        console.log('✅ Bot message saved to database with metadata');
      } catch (saveError) {
        console.error('❌ Error saving bot message:', saveError);
      }

    } catch (error: any) {
      console.error('❌ Error in sendMessage:', error);
      
      if (error.name === 'AbortError') {
        console.log('🚫 Request was cancelled');
        return;
      }
      
      const errorMessage = error instanceof Error 
        ? `Sorry, I'm having trouble connecting right now. ${error.message}` 
        : "Sorry, there was an error processing your message. Please try again.";
        
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "connie",
        text: errorMessage,
        timestamp: new Date(),
      };

      setMessages(prevMessages => [...prevMessages, errorMsg]);
    } finally {
      if (mountedRef.current) {
        setIsBotThinking(false);
        setIsBotTyping(false);
        setTypingBotMsg(null);
        setCurrentTypingText('');
        setIsLoading(false);
      }
      isProcessingRef.current = false;
      abortControllerRef.current = null;
      console.log('🏁 ===== SEND MESSAGE COMPLETED =====');
    }
  }, [sessionId, selectedVoice, speakText, unlockAudio]);

  // Enhanced sendBotMessage with proper database saving and typing
  const sendBotMessage = useCallback(async (text: string, isIntro: boolean = false) => {
    console.log('🤖 sendBotMessage called:', text.substring(0, 30));
    console.log('🤖 Session ID:', sessionId);
    console.log('🤖 Is intro message:', isIntro);
    
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      sender: "connie",
      text,
      timestamp: new Date(),
    };
    
    console.log('🤖 Bot message created:', botMsg.id);
    
    // Apply typing effect with voice
    console.log('🤖 Starting typing effect...');
    await showTypingEffect(text, true);
    
    // Add to UI messages
    console.log('🤖 Adding message to UI...');
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, botMsg];
      console.log('🤖 Messages after adding:', newMessages.length);
      return newMessages;
    });
    
    // Save to database if session exists
    if (sessionId) {
      console.log('💾 Saving bot message to database...');
      try {
        await ChatStorageService.saveMessage(
          sessionId,
          'connie',
          botMsg.text,
          {
            selectedVoice,
            metadata: {
              timestamp: new Date().toISOString(),
              messageId: botMsg.id,
              isIntroMessage: isIntro
            }
          }
        );
        console.log('✅ Bot message saved to database');
      } catch (saveError) {
        console.error('❌ Error saving bot message:', saveError);
      }
    } else {
      console.warn('⚠️ No session ID - bot message will appear in UI but not be saved to database');
    }
  }, [sessionId, selectedVoice, speakText]);

  // Send intro message with proper tracking
  const sendIntroMessage = useCallback(() => {
    console.log('🚀 sendIntroMessage called');
    console.log('🚀 Session ID:', sessionId);
    
    if (sessionId) {
      console.log('🚀 ✅ Sending intro message');
      
      const introText = "Hi, I'm Connie, your personal conference assistant! What would you like to know about the conference?";
      sendBotMessage(introText, true);
    } else {
      console.log('🚀 ❌ No session ID, skipping intro');
    }
  }, [sendBotMessage, sessionId]);

  // Handle voice input
  const handleVoiceInput = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    console.log('🎤 Voice input received:', transcript);

    // Log voice input analytics
    try {
      await ChatStorageService.logAnalyticsEvent(sessionId || 'unknown', 'voice_input', {
        transcript,
        transcript_length: transcript.length,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.warn('⚠️ Failed to log voice input:', error);
    }

    // Send as voice message
    await sendMessage(transcript, true);
  }, [sessionId, sendMessage]);

  // Stop typing function
  const stopTyping = useCallback(() => {
    console.log('🛑 Stopping typing effects');
    setIsBotTyping(false);
    setIsBotThinking(false);
    setTypingBotMsg(null);
    setCurrentTypingText('');
  }, []);

  return {
    // Enhanced typing system (from first hook)
    messages,
    isBotTyping,
    isBotThinking,
    typingBotMsg,
    sendMessage,
    sendBotMessage,
    sendIntroMessage,
    stopTyping,
    
    // AI Router system (from second hook)  
    isLoading,
    currentTypingText,
    handleVoiceInput,
    initializeChat,
    
    // Combined functionality
    isProcessing: isProcessingRef.current,
  };
};