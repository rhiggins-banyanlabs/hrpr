// hooks/useChat.ts - OPTIMIZED VERSION without console logs or typing animation
import { useState, useRef, useCallback } from 'react';
import { ChatStorageService } from '@/lib/supabase/chatStorage';
import { IntentDetectorService } from '@/services/intent-detector.service';
import { NameExtractorService } from '@/services/name-extractor.service';
import { iosAudioService } from '@/services/ios-audio.service';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'Harper';
  timestamp: Date;
  isTyping?: boolean;
  isIntroMessage?: boolean;
  isTemporary?: boolean;
  isVoiceTranscription?: boolean;
  isIntro?: boolean;
}

interface UseChatProps {
  // Enhanced props (from first hook)
  speakText?: ((text: string, options?: { voice?: string; isWaitingForAPI?: boolean; isStreamingChunk?: boolean }) => Promise<any>) | ((text: string, voice?: any, speed?: number) => Promise<any>);
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
  sessionId
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
  const userNameRef = useRef<string | null>(null);

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
    } catch (error) {
      // Silently fail
    }
  };

  // Simplified voice playback without typing animation
  const playVoiceResponse = async (text: string, fillerAudioPromise?: Promise<any> | null) => {
    if (!speakText) return;
    
    setIsBotThinking(true);
    
    try {
      // Wait for filler response to complete if provided
      if (fillerAudioPromise) {
        const fillerResult = await fillerAudioPromise;
        
        if (fillerResult && fillerResult.audio) {
          await new Promise<void>((resolve) => {
            const checkAudioComplete = () => {
              if (fillerResult.audio.ended || fillerResult.audio.paused) {
                resolve();
              } else {
                setTimeout(checkAudioComplete, 100);
              }
            };
            
            checkAudioComplete();
            
            // Fallback timeout
            setTimeout(resolve, 5000);
          });
          
          // Small pause between filler and main response
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      setIsBotThinking(false);
      await speakText(text);
      
    } catch (voiceError) {
      setIsBotThinking(false);
    }
  };

  // Initialize chat with Harper's intro message
  const initializeChat = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      const introMessage: Message = {
        id: `intro-${Date.now()}`,
        text: "Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!",
        sender: 'Harper',
        timestamp: new Date(),
        isIntroMessage: true
      };

      setMessages([introMessage]);

      // Save intro message to database
      try {
        const savedIntroMessage = await ChatStorageService.saveMessage(
          sessionId,
          'Harper',
          introMessage.text,
          {
            metadata: { isIntroMessage: true, messageId: introMessage.id }
          }
        );
        
        // Update the message with the saved ID
        if (savedIntroMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === introMessage.id 
              ? { ...msg, id: savedIntroMessage.id }
              : msg
          ));
        }
      } catch (error) {
        // Silently fail
      }

    } catch (error) {
      // Silently fail
    }
  }, [sessionId]);

  // STREAMING sendMessage with instant TTS and wake lock
  const sendMessage = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    if (isProcessingRef.current || !text.trim() || !sessionId) {
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    isProcessingRef.current = true;
    setIsLoading(true);
    
    // Acquire wake lock to prevent iOS audio blocking
    console.log('🔒 [STREAMING] Requesting iOS wake lock...');
    await iosAudioService.requestWakeLock();
    
    if (unlockAudio) {
      await unlockAudio();
    }

    try {
      // Cache the user question for analytics
      await cacheUserQuestion(text.trim());

      // Check for name extraction
      if (!userNameRef.current) {
        const nameInfo = NameExtractorService.extractName(text);
        if (nameInfo.name && nameInfo.confidence !== 'low') {
          userNameRef.current = nameInfo.name;
          console.log('👤 User name extracted:', userNameRef.current);
        }
      }

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
      try {
        const savedUserMessage = await ChatStorageService.saveMessage(
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
        
        // Update the local message with the saved ID
        if (savedUserMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === userMessage.id 
              ? { ...msg, id: savedUserMessage.id }
              : msg
          ));
        }
      } catch (saveError) {
        // Silently fail
      }

      // IMMEDIATELY start aggressive keep-alive BEFORE any API calls
      console.log('🎯 [STREAMING] IMMEDIATELY starting aggressive keep-alive');
      iosAudioService.startKeepAlive(true);
      
      // IMMEDIATELY request wake lock to prevent any suspension  
      console.log('🎯 [STREAMING] IMMEDIATELY requesting wake lock');
      await iosAudioService.requestWakeLock();
      
      // Start persistent keep-alive AND play filler response
      console.log('🎯 [STREAMING] Starting streaming with enhanced keep-alive + filler');

      let fillerAudioPromise: Promise<any> | null = null;
      const fillerResponse = IntentDetectorService.getFillerResponse(text);
      if (fillerResponse && speakText) {
        console.log('🎯 [STREAMING] Playing filler while streaming starts:', fillerResponse);
        fillerAudioPromise = (speakText as any)(fillerResponse, { isWaitingForAPI: true }).catch(() => null);
      }

      // Show thinking dots
      setIsBotThinking(true);

      // Create new abort controller for streaming
      abortControllerRef.current = new AbortController();

      // ✨ USE STREAMING ENDPOINT for instant TTS ✨
      console.log('🎯 [STREAMING] Starting OpenAI streaming...');
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: text,
          userName: userNameRef.current
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Streaming API request failed: ${response.status}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body for streaming');

      let fullText = '';
      let currentSentence = '';
      let isFirstChunk = true;
      
      // Create initial bot message
      const botMessage: Message = {
        id: `Harper-${Date.now()}`,
        sender: "Harper",
        text: '',
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, botMessage]);
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'sentence') {
                  const sentence = parsed.content;
                  fullText += sentence + ' ';
                  
                  console.log('🎯 [STREAMING] Got sentence chunk:', sentence);
                  
                  // Wait for filler to complete on first chunk
                  if (isFirstChunk && fillerAudioPromise) {
                    console.log('🎯 [STREAMING] Waiting for filler to complete...');
                    await fillerAudioPromise;
                    setIsBotThinking(false);
                    isFirstChunk = false;
                  }
                  
                  // Update UI with accumulating text
                  setMessages(prev => prev.map(msg => 
                    msg.id === botMessage.id 
                      ? { ...msg, text: fullText.trim() }
                      : msg
                  ));
                  
                  // 🚀 INSTANTLY send sentence to TTS (this is the magic!)
                  if (speakText && sentence.trim()) {
                    console.log('🎯 [STREAMING] 🚀 INSTANT TTS for sentence:', sentence);
                    // Mark this as a streaming chunk to prevent chunked TTS overlap
                    try {
                      // Cast to the enhanced function type and call with streaming flag
                      const enhancedSpeakText = speakText as (text: string, options?: { voice?: string; isWaitingForAPI?: boolean; isStreamingChunk?: boolean }) => Promise<any>;
                      enhancedSpeakText(sentence.trim(), { isStreamingChunk: true }).catch((error: any) => {
                        console.error('🎯 [STREAMING] TTS error for sentence:', error);
                      });
                    } catch (error) {
                      console.error('🎯 [STREAMING] TTS call error:', error);
                      // Fallback to basic call if enhanced call fails
                      try {
                        const basicSpeakText = speakText as (text: string) => Promise<any>;
                        basicSpeakText(sentence.trim()).catch((fallbackError: any) => {
                          console.error('🎯 [STREAMING] Fallback TTS error:', fallbackError);
                        });
                      } catch (fallbackError) {
                        console.error('🎯 [STREAMING] All TTS calls failed:', fallbackError);
                      }
                    }
                  }
                  
                } else if (parsed.type === 'complete') {
                  console.log('🎯 [STREAMING] Stream complete. Full text:', parsed.fullText);
                  fullText = parsed.fullText;
                  
                  // Update final message
                  setMessages(prev => prev.map(msg => 
                    msg.id === botMessage.id 
                      ? { ...msg, text: fullText.trim() }
                      : msg
                  ));
                  
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.error);
                }
                
              } catch (parseError) {
                console.error('🎯 [STREAMING] Parse error:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Save final message to database
      try {
        const savedBotMessage = await ChatStorageService.saveMessage(
          sessionId,
          'Harper',
          fullText.trim(),
          {
            selectedVoice,
            metadata: {
              timestamp: new Date().toISOString(),
              messageId: botMessage.id,
              isStreamed: true,
              questionCategory: categorizeQuestion(text.trim()),
              hasConferenceData: true
            }
          }
        );
        
        if (savedBotMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === botMessage.id 
              ? { ...msg, id: savedBotMessage.id }
              : msg
          ));
        }
      } catch (saveError) {
        console.error('🎯 [STREAMING] DB save error:', saveError);
      }
      
      console.log('🎯 [STREAMING] ✅ Streaming complete with instant TTS!');

    } catch (error: any) {
      console.log('🎯 [STREAMING] ❌ Error, cleaning up...');
      iosAudioService.stopKeepAlive();
      iosAudioService.releaseWakeLock();
      
      if (error.name === 'AbortError') {
        return;
      }
      
      const errorMessage = error instanceof Error 
        ? `Sorry, I'm having trouble connecting right now. ${error.message}` 
        : "Sorry, there was an error processing your message. Please try again.";
        
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "Harper",
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
      
      // Release wake lock when done
      setTimeout(() => {
        iosAudioService.releaseWakeLock();
      }, 5000); // Keep wake lock for 5 more seconds after completion
    }
  }, [sessionId, selectedVoice, speakText, unlockAudio]);

  // Enhanced sendBotMessage with proper database saving
  const sendBotMessage = useCallback(async (text: string, isIntro: boolean = false) => {
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      sender: "Harper",
      text,
      timestamp: new Date(),
      isIntro: isIntro
    };
  
    // Play voice response
    await playVoiceResponse(text);
  
    // Add to UI messages
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, botMsg];
      return newMessages;
    });
  
    // Save to database if session exists
    if (sessionId) {
      try {
        const savedBotMessage = await ChatStorageService.saveMessage(
          sessionId,
          'Harper',
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
  
        // Update the local message with the saved ID
        if (savedBotMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === botMsg.id 
              ? { ...msg, id: savedBotMessage.id }
              : msg
          ));
        }
      } catch (saveError) {
        // Silently fail
      }
    }
  }, [sessionId, selectedVoice, speakText]);
  
  // Send intro message with proper tracking
  const sendIntroMessage = useCallback(() => {
    if (sessionId) {
      const introText = "Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!";
      sendBotMessage(introText, true);
    }
  }, [sendBotMessage, sessionId]);
  
  // Handle voice input
  const handleVoiceInput = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    // Log voice input analytics
    try {
      await ChatStorageService.logAnalyticsEvent(sessionId || 'unknown', 'voice_input', {
        transcript,
        transcript_length: transcript.length,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      // Silently fail
    }

    // Send as voice message
    await sendMessage(transcript, true);
  }, [sessionId, sendMessage]);

  // Stop typing function
  const stopTyping = useCallback(() => {
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
    
    // Legacy functions (if needed)
    sendMessageNonStreaming: sendMessage,
  };
};