// hooks/useChat.ts - OPTIMIZED VERSION
import { useState, useRef, useCallback } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'connie';
  timestamp: Date;
  isTyping?: boolean;
}

// Response cache for faster repeated questions
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useChat = ({ speakText, unlockAudio }: { 
  speakText?: (text: string) => Promise<any>;
  unlockAudio: () => Promise<void>;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [typingBotMsg, setTypingBotMsg] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const mountedRef = useRef(true);
  const hasIntroSentRef = useRef(false);

  console.log('🏠 useChat render - messages:', messages.length);

  mountedRef.current = true;

  // OPTIMIZED: Faster typing effect
  const showTypingEffect = async (text: string, withVoice: boolean = false) => {
    console.log('🔤 Fast typing effect for:', text.substring(0, 30));
    
    if (withVoice && speakText) {
      console.log('🔊 Starting voice...');
      setIsBotThinking(true);
      setIsBotTyping(false);
      setTypingBotMsg(null);
      
      // Start voice in parallel with typing preparation
      const voicePromise = speakText(text);
      
      // Don't wait for voice metadata - start typing immediately
      setIsBotThinking(false);
      setIsBotTyping(true);
      setTypingBotMsg('');
      
      // Wait minimal time for voice to start
      setTimeout(async () => {
        try {
          await voicePromise;
        } catch (error) {
          console.log('🔊 Voice failed, continuing with typing:', error);
        }
      }, 50);
      
    } else {
      setIsBotTyping(true);
      setTypingBotMsg('');
    }
    
    // OPTIMIZED: Much faster typing (30ms instead of 50ms)
    return new Promise<void>((resolve) => {
      let currentText = '';
      let charIndex = 0;
      const charDelay = 30; // Faster typing
      
      const typeNextChar = () => {
        if (charIndex < text.length) {
          currentText += text[charIndex];
          setTypingBotMsg(currentText);
          charIndex++;
          setTimeout(typeNextChar, charDelay);
        } else {
          console.log('✅ Fast typing completed');
          setIsBotTyping(false);
          setTypingBotMsg(null);
          resolve();
        }
      };
      
      typeNextChar();
    });
  };

  // OPTIMIZED: Check cache first, shorter prompts, parallel processing
  const sendMessage = useCallback(async (text: string) => {
    console.log('📨 ===== OPTIMIZED SEND MESSAGE =====');
    const startTime = performance.now();
    
    if (isProcessingRef.current || !text.trim()) {
      console.log('⏹️ Skipping - already processing or empty text');
      return;
    }

    if (!mountedRef.current) {
      console.log('⚠️ Component unmounted, skipping send');
      return;
    }

    isProcessingRef.current = true;
    console.log('🔒 Set processing to true');

    // OPTIMIZATION 1: Pre-unlock audio (don't await)
    unlockAudio().catch(console.error);

    try {
      // OPTIMIZATION 2: Create and add user message immediately
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      console.log('👤 Adding user message immediately');
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, userMsg];
        console.log('👤 ✅ USER MESSAGE ADDED - Count:', newMessages.length);
        return newMessages;
      });

      // OPTIMIZATION 3: Check cache first
      const cacheKey = text.toLowerCase().trim();
      const cached = responseCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('🚀 CACHE HIT! Using cached response');
        
        // Use cached response immediately
        const botMsg: Message = {
          id: `connie_${Date.now()}`,
          sender: "connie",
          text: cached.response,
          timestamp: new Date(),
        };

        // Show fast typing effect
        await showTypingEffect(cached.response, true);
        
        setMessages(prevMessages => [...prevMessages, botMsg]);
        
        const totalTime = performance.now() - startTime;
        console.log(`🚀 CACHED RESPONSE TIME: ${totalTime.toFixed(0)}ms`);
        return;
      }

      // Show thinking dots for API call
      setIsBotThinking(true);

      // OPTIMIZATION 4: Much shorter, optimized prompt
      const conniePrompt = `You're Connie, a friendly conference assistant.

Conference Info:
- Sessions: 9 AM-5 PM
- Breaks: 11 AM, 3 PM
- Keynote: 2 PM main auditorium
- Lunch: 12-1 PM dining hall
- Location: Grand Convention Center

Question: ${text}

Give a helpful, conversational response under 300 characters.`;

      // OPTIMIZATION 5: Start API call with optimized settings
      console.log('🌐 Fast API call...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch('/api/ai-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: conniePrompt,
          strategy: 'fast', // Use fast strategy if available
          maxTokens: 150,   // Limit tokens for faster response
          temperature: 0.7  // Lower temperature for faster generation
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `AI Router error: ${response.status}`);
      }

      if (!data.response) {
        throw new Error('No response received from AI router');
      }

      const apiTime = performance.now() - startTime;
      console.log(`🌐 API Response time: ${apiTime.toFixed(0)}ms`);

      // OPTIMIZATION 6: Cache the response
      responseCache.set(cacheKey, {
        response: data.response,
        timestamp: now
      });

      // Clean old cache entries (keep cache size manageable)
      if (responseCache.size > 50) {
        const entries = Array.from(responseCache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        responseCache.clear();
        entries.slice(0, 30).forEach(([key, value]) => {
          responseCache.set(key, value);
        });
      }

      // OPTIMIZATION 7: Start typing immediately (don't wait for voice)
      const typingPromise = showTypingEffect(data.response, true);
      
      // Create bot message
      const botMsg: Message = {
        id: `connie_${Date.now()}`,
        sender: "connie",
        text: data.response,
        timestamp: new Date(),
      };

      // Wait for typing to complete, then add message
      await typingPromise;
      
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, botMsg];
        console.log('💬 ✅ BOT MESSAGE ADDED - Count:', newMessages.length);
        return newMessages;
      });

      const totalTime = performance.now() - startTime;
      console.log(`🚀 TOTAL RESPONSE TIME: ${totalTime.toFixed(0)}ms`);
      console.log('🤖 Response by:', data.provider);

    } catch (err) {
      console.error('❌ Error in sendMessage:', err);
      
      const errorMessage = err instanceof Error 
        ? `Sorry, I'm having trouble connecting. ${err.message}` 
        : "Sorry, there was an error. Please try again.";
        
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
      console.log('🏁 ===== OPTIMIZED SEND COMPLETED =====');
    }
  }, [speakText, unlockAudio]);

  // OPTIMIZED: Faster intro message
  const sendBotMessage = useCallback(async (text: string) => {
    console.log('🤖 Fast sendBotMessage:', text.substring(0, 30));
    
    const botMsg: Message = {
      id: `bot_${Date.now()}`,
      sender: "connie",
      text,
      timestamp: new Date(),
    };
    
    // Fast typing effect
    await showTypingEffect(text, true);
    
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, botMsg];
      console.log('🤖 ✅ INTRO MESSAGE ADDED');
      return newMessages;
    });
  }, [speakText]);

  const sendIntroMessage = useCallback(() => {
    console.log('🚀 sendIntroMessage called');
    
    if (!hasIntroSentRef.current) {
      console.log('🚀 ✅ Sending intro message');
      hasIntroSentRef.current = true;
      
      // OPTIMIZED: Shorter intro message
      const introText = "Hi! I'm Connie, your conference assistant. What can I help you with?";
      sendBotMessage(introText);
    } else {
      console.log('🚀 ❌ Intro already sent, skipping');
    }
  }, [sendBotMessage]);

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