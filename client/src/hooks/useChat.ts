// hooks/useChat.ts - FIXED VERSION (Your original logic restored)
import { useState, useRef, useCallback } from 'react';
import { CacheService } from '@/services/cache.service';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'connie';
  timestamp: Date;
  isTyping?: boolean;
}

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

  console.log('🏠 useChat render - messages:', messages.length, messages.map(m => `${m.sender}: ${m.text.substring(0, 20)}...`));

  mountedRef.current = true;

  // RESTORED: Your original typing effect with voice synchronization
  const showTypingEffect = async (text: string, withVoice: boolean = false) => {
    console.log('🔤 Starting typing effect for:', text.substring(0, 30));
    
    if (withVoice && speakText) {
      console.log('🔊 Starting voice and showing thinking dots...');
      
      // Show thinking dots while voice loads
      setIsBotThinking(true);
      setIsBotTyping(false);
      setTypingBotMsg(null);
      
      // Start voice and get the audio object
      const voiceResult = await speakText(text);
      
      // Stop thinking dots, prepare for typing
      setIsBotThinking(false);
      setIsBotTyping(true);
      setTypingBotMsg('');
      
      if (voiceResult && voiceResult.audio) {
        // RESTORED: Wait for the audio to actually start playing
        await new Promise<void>((resolve) => {
          const audio = voiceResult.audio;
          
          const onPlay = () => {
            console.log('🎵 Audio is now playing - typing synchronized!');
            audio.removeEventListener('play', onPlay);
            resolve();
          };
          
          audio.addEventListener('play', onPlay);
          
          // Fallback timeout
          setTimeout(() => {
            console.log('⏰ Fallback timeout - starting typing anyway');
            audio.removeEventListener('play', onPlay);
            resolve();
          }, 100);
        });
      } else {
        console.log('⚠️ No audio object returned, starting typing immediately');
      }
    } else {
      // No voice, start typing immediately
      setIsBotTyping(true);
      setTypingBotMsg('');
    }
    
    // RESTORED: Your original typing speed
    return new Promise<void>((resolve) => {
      let currentText = '';
      let charIndex = 0;
      const charDelay = 50; // Back to your original 50ms timing
      
      const typeNextChar = () => {
        if (charIndex < text.length) {
          currentText += text[charIndex];
          setTypingBotMsg(currentText);
          charIndex++;
          setTimeout(typeNextChar, charDelay);
        } else {
          // Finished typing
          console.log('✅ Typing effect completed');
          setIsBotTyping(false);
          setTypingBotMsg(null);
          resolve();
        }
      };
      
      typeNextChar();
    });
  };

  // Enhanced sendMessage with OPTIONAL caching (preserves your original logic)
  const sendMessage = useCallback(async (text: string) => {
    console.log('📨 ===== SEND MESSAGE STARTED =====');
    console.log('📨 Message text:', text);
    console.log('📨 Current messages before send:', messages.length);
    
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

    // Unlock audio for voice playback
    await unlockAudio();

    try {
      // OPTIONAL: Check cache first (can be disabled)
      const cachedResult = CacheService.getCachedResponse(text, 'balanced');
      if (cachedResult) {
        console.log('🚀 Using cached response');
        
        // Add user message
        const userMsg: Message = {
          id: `user_${Date.now()}`,
          sender: "user",
          text: text.trim(),
          timestamp: new Date(),
        };

        setMessages(prevMessages => {
          const newMessages = [...prevMessages, userMsg];
          console.log('👤 ✅ USER MESSAGE ADDED TO STATE');
          return newMessages;
        });

        // Create cached bot message
        const botMsg: Message = {
          id: `connie_${Date.now()}`,
          sender: "connie",
          text: cachedResult.response,
          timestamp: new Date(),
        };

        // Show typing effect with voice (your original sync)
        await showTypingEffect(cachedResult.response, true);
        
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, botMsg];
          console.log('💬 ✅ CACHED BOT MESSAGE ADDED TO STATE');
          return newMessages;
        });

        return;
      }

      // Create user message
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      console.log('👤 Creating user message:', userMsg);

      // Add user message first
      await new Promise<void>((resolve) => {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, userMsg];
          console.log('👤 ✅ USER MESSAGE ADDED TO STATE');
          console.log('👤 Previous count:', prevMessages.length);
          console.log('👤 New count:', newMessages.length);
          console.log('👤 User message:', userMsg.text);
          setTimeout(resolve, 0);
          return newMessages;
        });
      });
      
      console.log('👤 User message state update completed');
      
      // Show thinking dots
      console.log('🤔 Starting thinking state...');
      setIsBotThinking(true);

      // RESTORED: Your original prompt
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
      console.log('🌐 Fetching bot response...');
      
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

      // Cache the successful response
      if (data.response) {
        CacheService.setCachedResponse(
          text,
          'balanced',
          data.response,
          data.provider || 'unknown',
          data.cost,
          data.tokensUsed
        );
      }

      // Create bot message
      const botMsg: Message = {
        id: `connie_${Date.now()}`,
        sender: "connie",
        text: data.response,
        timestamp: new Date(),
      };

      console.log('🤖 Created bot message');

      // RESTORED: Your original typing effect with voice sync
      console.log('🎭 Starting typing effect...');
      await showTypingEffect(data.response, true);
      
      // Add bot message to state
      console.log('💬 Adding bot message to state...');
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, botMsg];
        console.log('💬 ✅ BOT MESSAGE ADDED TO STATE');
        console.log('💬 Final message count:', newMessages.length);
        return newMessages;
      });

      console.log('🤖 Response generated by:', data.provider);

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
        console.log('🧹 Cleaning up...');
        setIsBotThinking(false);
        setIsBotTyping(false);
        setTypingBotMsg(null);
      }
      isProcessingRef.current = false;
      console.log('🏁 ===== SEND MESSAGE COMPLETED =====');
    }
  }, [speakText, unlockAudio]);

  // Send bot message directly (for intro)
  const sendBotMessage = useCallback(async (text: string) => {
    console.log('🤖 sendBotMessage called:', text.substring(0, 30));
    
    const botMsg: Message = {
      id: `bot_${Date.now()}`,
      sender: "connie",
      text,
      timestamp: new Date(),
    };
    
    // Apply typing effect with voice (your original sync)
    await showTypingEffect(text, true);
    
    // Add to messages
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, botMsg];
      console.log('🤖 ✅ INTRO MESSAGE ADDED TO STATE');
      console.log('🤖 Message count:', newMessages.length);
      return newMessages;
    });
  }, [speakText]);

  // Send intro message with proper tracking
  const sendIntroMessage = useCallback(() => {
    console.log('🚀 sendIntroMessage called');
    console.log('🚀 hasIntroSentRef:', hasIntroSentRef.current);
    
    if (!hasIntroSentRef.current) {
      console.log('🚀 ✅ Sending intro message');
      hasIntroSentRef.current = true;
      
      // RESTORED: Your original greeting message
      const introText = "Hi, I'm Connie, your personal conference assistant. What would you like to ask me? If you need help coming up with a question, there are some suggestions you can choose from below.";
      sendBotMessage(introText);
    } else {
      console.log('🚀 ❌ Intro already sent, skipping');
    }
  }, [sendBotMessage]);

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