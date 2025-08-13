import { useState, useCallback, useRef, useEffect } from 'react';
import { iosAudioService } from '@/services/ios-audio.service';
import { OpenAIVoice } from '@/features/voice/types/voice.types';

// Detect iOS devices with enhanced debugging
const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') {
    console.log('🍎 iOS Detection: Window undefined (SSR)');
    return false;
  }
  
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = navigator.maxTouchPoints;
  
  console.log('🍎 iOS Detection Debug:', {
    userAgent,
    platform,
    maxTouchPoints,
    MSStream: !!(window as any).MSStream
  });
  
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  const result = isIOS || isIPadOS;
  
  console.log('🍎 iOS Detection Result:', {
    isIOS,
    isIPadOS,
    isSafari,
    finalResult: result
  });
  
  return result;
};

export const useEnhancedOptimizedVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoice>('nova');
  
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isIOSRef = useRef(isIOSDevice());
  const introMessageCachedRef = useRef(false);
  
  // Check if audio is unlocked (especially important for iOS)
  const checkAudioUnlock = useCallback(() => {
    if (isIOSRef.current) {
      const unlocked = iosAudioService.isAudioUnlocked();
      setIsUnlocked(unlocked);
      return unlocked;
    }
    // For non-iOS devices, assume unlocked
    setIsUnlocked(true);
    return true;
  }, []);
  
  // Unlock audio on user interaction (iOS requirement)
  const unlockAudio = useCallback(async (): Promise<boolean> => {
    console.log('🔓 Unlocking audio...');
    
    try {
      const isCurrentlyIOS = isIOSDevice();
      if (isCurrentlyIOS) {
        const success = await iosAudioService.manualUnlock();
        console.log('🔓 iOS audio unlock result:', success);
        setIsUnlocked(success);
        
        if (success) {
          console.log('🔓 Audio unlocked successfully - ready for playback');
          setError(null);
        } else {
          console.error('🔓 Failed to unlock audio - playback will fail');
          setError('Failed to unlock audio. Please try tapping the screen.');
        }
        
        return success;
      }
      
      // For non-iOS, create a dummy audio context to unlock
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        audioContext.close();
        setIsUnlocked(true);
        setError(null);
        return true;
      } catch (error) {
        console.error('🔓 Non-iOS audio unlock failed:', error);
        setError('Failed to initialize audio');
        return false;
      }
    } catch (error) {
      console.error('🔓 Audio unlock error:', error);
      setError('Failed to unlock audio');
      return false;
    }
  }, []);
  
  // Speak text with platform-specific handling
  const speakText = useCallback(async (text: string, voiceOrOptions?: string | { voice?: string; isWaitingForAPI?: boolean }): Promise<void> => {
    // Handle both old signature (voice as string) and new signature (options object)
    const voice = typeof voiceOrOptions === 'string' ? voiceOrOptions : (voiceOrOptions?.voice || selectedVoice);
    const isWaitingForAPI = typeof voiceOrOptions === 'object' ? voiceOrOptions.isWaitingForAPI : false;
    try {
      console.log(`🔊 Speaking text with OpenAI TTS (iOS: ${isIOSRef.current}):`, text.substring(0, 100));
      console.log('🔊 Using OpenAI TTS for all devices:', {
        isIOSRef: isIOSRef.current,
        currentDetection: isIOSDevice(),
        voice: voice,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR'
      });
      setError(null);
      
      // Check iOS status fresh each time for enhanced audio handling
      const isCurrentlyIOS = isIOSDevice();
      
      // For iOS, always ensure audio is unlocked before speaking
      if (isCurrentlyIOS) {
        console.log('🔓 Checking iOS audio unlock status:', isUnlocked);
        if (!isUnlocked) {
          // Try to unlock audio in current user interaction context
          try {
            const unlocked = await unlockAudio();
            console.log('🔓 Audio unlock result:', unlocked);
            if (!unlocked) {
              throw new Error('Audio is locked. Please tap the voice button again to enable OpenAI TTS audio.');
            }
          } catch (unlockError) {
            console.error('🔓 Audio unlock failed:', unlockError);
            throw new Error('Could not unlock audio for OpenAI TTS playback. Please try tapping again.');
          }
        }
      }
      
      // Use OpenAI TTS exclusively (no more iOS native TTS)
      if (isCurrentlyIOS) {
        console.log('🍎 Using OpenAI TTS for iOS with enhanced audio handling');
        
        return new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            console.warn('🔊 OpenAI TTS timeout - forcing stop');
            setIsSpeaking(false);
            iosAudioService.stopSpeaking();
            reject(new Error('TTS timeout'));
          }, 15000);
          
          iosAudioService.speakText(text, {
            voice,
            isWaitingForAPI,
            onStart: () => {
              console.log('🔊 OpenAI TTS started');
              setIsSpeaking(true);
            },
            onEnd: () => {
              console.log('🔊 OpenAI TTS ended');
              clearTimeout(timeoutId);
              setIsSpeaking(false);
              resolve();
            },
            onError: (error) => {
              console.error('🔊 OpenAI TTS failed:', error);
              clearTimeout(timeoutId);
              setIsSpeaking(false);
              setError(error.message);
              reject(error);
            },
          });
        });
      } else {
        // Use OpenAI TTS for non-iOS devices too
        console.log('💻 Using OpenAI TTS for non-iOS device');
        
        return new Promise<void>((resolve, reject) => {
          // Stop any current audio
          if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            URL.revokeObjectURL(currentAudioRef.current.src);
          }
          
          // Get TTS audio from OpenAI API
          fetch('/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              voice,
              model: 'tts-1',
              response_format: 'mp3',
              speed: parseFloat(process.env.NEXT_PUBLIC_TTS_SPEED || '1.0'),
            }),
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`OpenAI TTS API failed: ${response.statusText}`);
            }
            return response.arrayBuffer();
          })
          .then(audioBuffer => {
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            
            currentAudioRef.current = audio;
            
            audio.onplay = () => {
              console.log('🔊 OpenAI TTS audio started');
              setIsSpeaking(true);
            };
            
            audio.onended = () => {
              console.log('🔊 OpenAI TTS audio ended');
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              resolve();
            };
            
            audio.onerror = (event) => {
              console.error('🔊 OpenAI TTS audio error:', event);
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              const error = new Error('OpenAI TTS playback failed');
              setError(error.message);
              reject(error);
            };
            
            return audio.play();
          })
          .catch(error => {
            console.error('🔊 OpenAI TTS error:', error);
            setError(error.message);
            reject(error);
          });
        });
      }
    } catch (error) {
      console.error('🔊 TTS error:', error);
      setIsSpeaking(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
      setError(errorMessage);
      throw error;
    }
  }, [isUnlocked, checkAudioUnlock, unlockAudio, selectedVoice]);
  
  // Stop speaking (OpenAI TTS)
  const stopSpeaking = useCallback(() => {
    console.log('🔊 Stopping OpenAI TTS speech');
    
    const isCurrentlyIOS = isIOSDevice();
    if (isCurrentlyIOS) {
      iosAudioService.stopSpeaking();
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        URL.revokeObjectURL(currentAudioRef.current.src);
        currentAudioRef.current = null;
      }
    }
    
    setIsSpeaking(false);
  }, []);
  
  // Pre-cache intro message
  const preCacheIntroMessage = useCallback(async (introText?: string): Promise<void> => {
    if (introMessageCachedRef.current) return;
    
    try {
      const text = introText || "Hello! I'm Harper, your AI conference assistant. You can ask me about speakers, sessions, locations, and more. How can I help you today?";
      
      console.log('🚀 Pre-caching OpenAI TTS intro message...');
      
      // Make a request to cache the intro message
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice || 'nova',
          model: 'tts-1',
          response_format: 'mp3',
          speed: parseFloat(process.env.NEXT_PUBLIC_TTS_SPEED || '1.0'),
        }),
      });
      
      if (response.ok) {
        // Just cache it, don't play it
        await response.arrayBuffer();
        introMessageCachedRef.current = true;
        console.log('🚀 OpenAI TTS intro message cached successfully');
      }
    } catch (error) {
      console.error('🚀 Failed to cache OpenAI TTS intro message:', error);
    }
  }, [selectedVoice]);
  
  // Check speaking state from iOS service (for OpenAI TTS)
  useEffect(() => {
    const isCurrentlyIOS = isIOSDevice();
    if (!isCurrentlyIOS) return;
    
    const checkSpeakingState = () => {
      const iosSpeaking = iosAudioService.isTTSSpeaking();
      if (iosSpeaking !== isSpeaking) {
        setIsSpeaking(iosSpeaking);
      }
    };
    
    const interval = setInterval(checkSpeakingState, 100);
    return () => clearInterval(interval);
  }, [isSpeaking]);
  
  // Initialize audio unlock on mount
  useEffect(() => {
    checkAudioUnlock();
  }, [checkAudioUnlock]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      const isCurrentlyIOS = isIOSDevice();
      if (isCurrentlyIOS) {
        iosAudioService.cleanup();
      }
    };
  }, [stopSpeaking]);
  
  return {
    speakText,
    stopSpeaking,
    unlockAudio,
    preCacheIntroMessage,
    isSpeaking,
    isUnlocked,
    error,
    selectedVoice,
    setSelectedVoice,
    isIOS: isIOSDevice(), // Always return current iOS detection
  };
};