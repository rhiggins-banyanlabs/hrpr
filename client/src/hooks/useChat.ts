// hooks/useChat.ts - Enhanced version with storage integration
import { useState, useRef, useCallback } from 'react';
import { CacheService } from '@/services/cache.service';
import { ChatStorageService } from '@/lib/supabase/chatStorage';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'connie';
  timestamp: Date;
  isTyping?: boolean;
}

interface UseChatProps {
  speakText?: (text: string) => Promise<any>;
  unlockAudio: () => Promise<void>;
  sessionId?: string | null; // Add session ID prop
  selectedVoice?: string; // Add selected voice prop
}

export const useChat = ({ 
  speakText, 
  unlockAudio,
  sessionId,
  selectedVoice
}: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [typingBotMsg, setTypingBotMsg] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const mountedRef = useRef(true);
  const hasIntroSentRef = useRef(false);

  console.log('🏠 useChat render - messages:', messages.length, 'sessionId:', sessionId);

  mountedRef.current = true;

  // Your existing typing effect function
  const showTypingEffect = async (text: string, withVoice: boolean = false) => {
    console.log('🔤 Starting typing effect for:', text.substring(0, 30));
    
    if (withVoice && speakText) {
      console.log('🔊 Starting voice and showing thinking dots...');
      
      setIsBotThinking(true);
      setIsBotTyping(false);
      setTypingBotMsg(null);
      
      const voiceResult = await speakText(text);
      
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
    } else {
      setIsBotTyping(true);
      setTypingBotMsg('');
    }
    
    return new Promise<void>((resolve) => {
      let currentText = '';
      let charIndex = 0;
      const charDelay = 50;
      
      const typeNextChar = () => {
        if (charIndex < text.length) {
          currentText += text[charIndex];
          setTypingBotMsg(currentText);
          charIndex++;
          setTimeout(typeNextChar, charDelay);
        } else {
          console.log('✅ Typing effect completed');
          setIsBotTyping(false);
          setTypingBotMsg(null);
          resolve();
        }
      };
      
      typeNextChar();
    });
  };

  // Enhanced sendMessage with storage
  const sendMessage = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    console.log('📨 ===== SEND MESSAGE STARTED =====');
    console.log('📨 Message text:', text);
    console.log('📨 Session ID:', sessionId);
    console.log('📨 Is voice input:', isVoiceInput);
    
    if (isProcessingRef.current || !text.trim()) {
      console.log('⏹️ Skipping - already processing or empty text');
      return;
    }

    if (!sessionId) {
      console.error('❌ No session ID available - cannot save messages');
      return;
    }

    isProcessingRef.current = true;
    await unlockAudio();

    try {
      // Create user message
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      // Add user message to UI
      setMessages(prevMessages => [...prevMessages, userMsg]);
      
      // Save user message to database
      console.log('💾 Saving user message to database...');
      await ChatStorageService.saveMessage(
        sessionId,
        'user',
        text.trim(),
        {
          isVoiceInput,
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
      );
      console.log('✅ User message saved to database');

      // Show thinking dots
      setIsBotThinking(true);

      // Your existing prompt
      const conniePrompt = `You are Connie, a helpful and friendly conference assistant. You help attendees with conference information including schedules, speakers, locations, food, networking events, and general conference amenities.

Conference Context:
- Main sessions: 9 AM - 5 PM daily
- Networking breaks: 11 AM and 3 PM  
- Keynote: 2 PM in main auditorium
- Lunch: 12 PM - 1 PM in main dining hall
- Location: Grand Convention Center, 123 Conference Ave
- Multiple floors with different session tracks
- Food options include vegetarian, vegan, and gluten-free
- Coffee and snacks available throughout the day

User Question: ${text}

Provide a helpful, friendly response as Connie. Be conversational and personable while being informative. Keep responses under 500 characters.`;

      // Get bot response
      const response = await fetch('/api/ai-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: conniePrompt,
          strategy: 'balanced'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `AI Router error: ${response.status}`);
      }

      if (!data.response) {
        throw new Error('No response received from AI router');
      }

      console.log('✅ Got bot response:', data.response.substring(0, 50) + '...');

      // Create bot message
      const botMsg: Message = {
        id: `connie_${Date.now()}`,
        sender: "connie",
        text: data.response,
        timestamp: new Date(),
      };

      // Show typing effect with voice
      await showTypingEffect(data.response, true);
      
      // Add bot message to UI
      setMessages(prevMessages => [...prevMessages, botMsg]);
      
      // Save bot message to database
      console.log('💾 Saving bot message to database...');
      await ChatStorageService.saveMessage(
        sessionId,
        'connie',
        data.response,
        {
          selectedVoice,
          metadata: {
            timestamp: new Date().toISOString(),
            provider: data.provider,
            cost: data.cost,
            tokensUsed: data.tokensUsed
          }
        }
      );
      console.log('✅ Bot message saved to database');

    } catch (err) {
      console.error('❌ Error in sendMessage:', err);
      
      const errorMessage = err instanceof Error 
        ? `Sorry, I'm having trouble connecting right now. ${err.message}` 
        : "Sorry, there was an error processing your message. Please try again.";
        
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
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
      }
      isProcessingRef.current = false;
      console.log('🏁 ===== SEND MESSAGE COMPLETED =====');
    }
  }, [speakText, unlockAudio, sessionId, selectedVoice]);

  // Send bot message directly (for intro) with storage
  const sendBotMessage = useCallback(async (text: string, isIntro: boolean = false) => {
    console.log('🤖 sendBotMessage called:', text.substring(0, 30));
    console.log('🤖 Session ID:', sessionId);
    
    const botMsg: Message = {
      id: `bot_${Date.now()}`,
      sender: "connie",
      text,
      timestamp: new Date(),
    };
    
    // Apply typing effect with voice
    await showTypingEffect(text, true);
    
    // Add to messages
    setMessages(prevMessages => [...prevMessages, botMsg]);
    
    // Save to database if session exists
    if (sessionId) {
      console.log('💾 Saving bot message to database...');
      await ChatStorageService.saveMessage(
        sessionId,
        'connie',
        text,
        {
          selectedVoice,
          metadata: {
            timestamp: new Date().toISOString(),
            isIntroMessage: isIntro
          }
        }
      );
      console.log('✅ Bot message saved to database');
    } else {
      console.warn('⚠️ No session ID - bot message not saved to database');
    }
  }, [speakText, sessionId, selectedVoice]);

  // Send intro message with proper tracking
  const sendIntroMessage = useCallback(() => {
    console.log('🚀 sendIntroMessage called');
    console.log('🚀 hasIntroSentRef:', hasIntroSentRef.current);
    console.log('🚀 Session ID:', sessionId);
    
    if (!hasIntroSentRef.current && sessionId) {
      console.log('🚀 ✅ Sending intro message');
      hasIntroSentRef.current = true;
      
      const introText = "Hi, I'm Connie, your personal conference assistant. What would you like to ask me? If you need help coming up with a question, there are some suggestions you can choose from below.";
      sendBotMessage(introText, true);
    } else {
      console.log('🚀 ❌ Intro already sent or no session, skipping');
    }
  }, [sendBotMessage, sessionId]);

  // Stop typing function
  const stopTyping = useCallback(() => {
    setIsBotTyping(false);
    setTypingBotMsg(null);
  }, []);

  return {
    messages,
    isBotTyping,
    isBotThinking,
    typingBotMsg,
    sendMessage,
    sendBotMessage,
    isProcessing: isProcessingRef.current,
    sendIntroMessage,
    stopTyping,
  };
};