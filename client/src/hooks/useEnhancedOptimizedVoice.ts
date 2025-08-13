import { useState, useCallback, useRef, useEffect } from 'react';
import { iosAudioService } from '@/services/ios-audio.service';

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
    const voice = typeof voiceOrOptions === 'string' ? voiceOrOptions : (voiceOrOptions?.voice || 'nova');
    const isWaitingForAPI = typeof voiceOrOptions === 'object' ? voiceOrOptions.isWaitingForAPI : false;
    try {
      console.log(`🔊 Speaking text (iOS: ${isIOSRef.current}):`, text.substring(0, 100));
      console.log('🔊 Full iOS detection check:', {
        isIOSRef: isIOSRef.current,
        currentDetection: isIOSDevice(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
        platform: typeof window !== 'undefined' ? navigator.platform : 'SSR'
      });
      setError(null);
      
      // Check iOS status fresh each time to ensure proper routing to FFmpeg conversion
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
              throw new Error('Audio is locked. Please tap the voice button again to enable audio.');
            }
          } catch (unlockError) {
            console.error('🔓 Audio unlock failed:', unlockError);
            throw new Error('Could not unlock audio for playback. Please try tapping again.');
          }
        }
      }
      
      // ALWAYS use iOS-compatible audio service for iOS devices (includes FFmpeg conversion)
      if (isCurrentlyIOS) {
        console.log('🍎 Using iOS audio service for TTS audio');
        console.log('🍎 Is waiting for API:', isWaitingForAPI);
        return new Promise<void>((resolve, reject) => {
          // Set a timeout to prevent getting stuck in speaking state
          const timeoutId = setTimeout(() => {
            console.warn('🔊 iOS TTS timeout - forcing stop');
            setIsSpeaking(false);
            iosAudioService.stopSpeaking();
            reject(new Error('TTS timeout'));
          }, 30000); // 30 second timeout
          
          iosAudioService.speakText(text, {
            voice,
            isWaitingForAPI,
            onStart: () => {
              console.log('🔊 iOS TTS started (with FFmpeg conversion)');
              setIsSpeaking(true);
            },
            onEnd: () => {
              console.log('🔊 iOS TTS ended (FFmpeg converted audio)');
              clearTimeout(timeoutId);
              setIsSpeaking(false);
              resolve();
            },
            onError: (error) => {
              console.error('🔊 iOS TTS error (during FFmpeg conversion):', error);
              clearTimeout(timeoutId);
              setIsSpeaking(false);
              setError(error.message);
              reject(error);
            },
          });
        });
      } else {
        // Use standard Web Audio API for non-iOS
        return new Promise<void>((resolve, reject) => {
          // Stop any current audio
          if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            URL.revokeObjectURL(currentAudioRef.current.src);
          }
          
          // Get TTS audio from API
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
              throw new Error(`TTS API failed: ${response.statusText}`);
            }
            return response.arrayBuffer();
          })
          .then(audioBuffer => {
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            
            currentAudioRef.current = audio;
            
            audio.onplay = () => {
              console.log('🔊 Non-iOS audio started');
              setIsSpeaking(true);
            };
            
            audio.onended = () => {
              console.log('🔊 Non-iOS audio ended');
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              resolve();
            };
            
            audio.onerror = (event) => {
              console.error('🔊 Non-iOS audio error:', event);
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              const error = new Error('Audio playback failed');
              setError(error.message);
              reject(error);
            };
            
            return audio.play();
          })
          .catch(error => {
            console.error('🔊 Non-iOS TTS error:', error);
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
  }, [isUnlocked, checkAudioUnlock, unlockAudio]);
  
  // Stop speaking
  const stopSpeaking = useCallback(() => {
    console.log('🔊 Stopping speech');
    
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
      
      console.log('🚀 Pre-caching intro message...');
      
      // Make a request to cache the intro message
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: 'nova',
          model: 'tts-1',
          response_format: 'mp3',
          speed: parseFloat(process.env.NEXT_PUBLIC_TTS_SPEED || '1.0'),
        }),
      });
      
      if (response.ok) {
        // Just cache it, don't play it
        await response.arrayBuffer();
        introMessageCachedRef.current = true;
        console.log('🚀 Intro message cached successfully');
      }
    } catch (error) {
      console.error('🚀 Failed to cache intro message:', error);
    }
  }, []);
  
  // Check speaking state from iOS service
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
    isIOS: isIOSDevice(), // Always return current iOS detection
  };
};