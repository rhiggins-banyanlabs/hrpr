// hooks/useOptimizedVoice.ts  – leak-proof version with iOS enhancement
import { useState, useRef, useCallback, useEffect } from 'react';
import { OpenAIVoice } from '@/features/voice/types/voice.types';
import { iosAudioService } from '@/services/ios-audio.service';

export const useOptimizedVoice = () => {
  /* ------------------------------------------------------------------ */
  /*  STATE + REFS                                                      */
  /* ------------------------------------------------------------------ */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoice>('nova');

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioCache = useRef<Map<string, string>>(new Map());

  // 🔑 every time we cancel speech we bump this number
  const speakGenRef = useRef(0);

  // iOS detection
  const isIOSDevice = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const maxTouchPoints = navigator.maxTouchPoints;
    
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;
    return isIOS || isIPadOS;
  }, []);

  /* ------------------------------------------------------------------ */
  /*  HELPER: unlock audio (needed on iOS / Android)                    */
  /* ------------------------------------------------------------------ */
  const unlockAudio = useCallback(async () => {
    if (audioUnlockedRef.current) return;
    
    if (isIOSDevice()) {
      console.log('🔒 [iOS] Using enhanced iOS audio unlock...');
      try {
        const success = await iosAudioService.manualUnlock();
        audioUnlockedRef.current = success;
        console.log('🔒 [iOS] Enhanced unlock result:', success);
        
        if (success) {
          // Request wake lock and start keep-alive for iOS
          await iosAudioService.requestWakeLock();
          iosAudioService.startKeepAlive(true);
        }
      } catch (err) {
        console.error('🔒 [iOS] Enhanced unlock failed:', err);
        audioUnlockedRef.current = false;
      }
    } else {
      // Non-iOS devices
      try {
        console.log('🔒 Audio unlock for non-iOS device');
        audioUnlockedRef.current = true;
      } catch (err) {
        console.log('🔒 Audio unlock not supported (this is normal)');
        audioUnlockedRef.current = true;
      }
    }
  }, [isIOSDevice]);

  /* ------------------------------------------------------------------ */
  /*  STOP CURRENT SPEECH                                               */
  /* ------------------------------------------------------------------ */
  const stopSpeaking = useCallback((gentle: boolean = false) => {
    console.log('🔊 stopSpeaking called', { gentle })
    speakGenRef.current += 1; // invalidate in-flight speakText calls
    
    // Stop iOS audio service if on iOS
    if (isIOSDevice()) {
      console.log('🔊 [iOS] Stopping iOS audio service');
      iosAudioService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    
    // Non-iOS: Original audio element handling
    if (currentAudioRef.current) {
      if (gentle) {
        // Gentle stop: fade out audio over 200ms to prevent abrupt cutoff
        const audio = currentAudioRef.current;
        const originalVolume = audio.volume;
        const fadeSteps = 10;
        const fadeInterval = 20; // 20ms per step = 200ms total
        let step = 0;
        
        const fadeOut = setInterval(() => {
          step++;
          const newVolume = originalVolume * (1 - step / fadeSteps);
          audio.volume = Math.max(0, newVolume);
          
          if (step >= fadeSteps || audio.paused || audio.ended) {
            clearInterval(fadeOut);
            audio.pause();
            audio.volume = originalVolume; // Reset volume for next use
            currentAudioRef.current = null;
            setIsSpeaking(false);
          }
        }, fadeInterval);
      } else {
        // Immediate stop (current behavior)
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
        setIsSpeaking(false);
      }
    } else {
      setIsSpeaking(false);
    }
  }, [isIOSDevice]);

  /* ------------------------------------------------------------------ */
  /*  (FAST) DURATION ESTIMATE                                          */
  /* ------------------------------------------------------------------ */
  const estimateDuration = useCallback((text: string) => {
    const wpm = 250;                          // faster speech
    const wordsPerSecond = wpm / 60;
    const wordCount = text.split(/\s+/).length;
    const punctuationPause = (text.match(/[.!?,:;]/g) || []).length * 0.15;
    return Math.max(1, wordCount / wordsPerSecond + punctuationPause);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  FETCH (OR CACHE) AUDIO                                            */
  /* ------------------------------------------------------------------ */
  const speakWithOptimizedTTS = useCallback(
    async (
      text: string,
      voice: OpenAIVoice = selectedVoice,
      speed: number = 1.00
    ) => {
      const cacheKey = `${text}-${voice}-${speed}`;
      if (audioCache.current.has(cacheKey)) {
        return {
          audio: new Audio(audioCache.current.get(cacheKey)!),
          duration: estimateDuration(text),
        };
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed, model: 'tts-1' }),
        // Add timeout for TTS API - optimized for tts-1 speed
        signal: AbortSignal.timeout(18000)
      });

      if (!res.ok) {
        throw new Error(`TTS API error: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // cache (keep last 20)
      audioCache.current.set(cacheKey, url);
      if (audioCache.current.size > 20) {
        const keys = [...audioCache.current.keys()];
        keys.slice(0, keys.length - 20).forEach(k => {
          URL.revokeObjectURL(audioCache.current.get(k)!);
          audioCache.current.delete(k);
        });
      }

      return { audio: new Audio(url), duration: estimateDuration(text) };
    },
    [selectedVoice, estimateDuration]
  );

  /* ------------------------------------------------------------------ */
  /*  MAIN speakText() — generation-safe                                */
  /* ------------------------------------------------------------------ */
  const speakText = useCallback(
    async (
      text: string,
      voice?: OpenAIVoice,
      speed?: number
    ): Promise<void> => {  // Changed return type to void for consistency
      if (!text.trim()) {
        console.log('🔊 No text provided for TTS');
        return;
      }

      console.log('🔊 [OPTIMIZED] Starting TTS for text:', text.substring(0, 50));
      
      // Use iOS audio service for iOS devices
      if (isIOSDevice()) {
        console.log('🔊 [iOS] Using iOS audio service for TTS');
        await unlockAudio(); // Ensure audio is unlocked first
        
        try {
          await iosAudioService.speakText(text, {
            voice: voice || selectedVoice,
            onStart: () => {
              console.log('🔊 [iOS] TTS started');
              setIsSpeaking(true);
            },
            onEnd: () => {
              console.log('🔊 [iOS] TTS ended');
              setIsSpeaking(false);
            },
            onError: (error) => {
              console.error('🔊 [iOS] TTS error:', error);
              setIsSpeaking(false);
            },
          });
        } catch (error) {
          console.error('🔊 [iOS] TTS failed:', error);
          setIsSpeaking(false);
          throw error;
        }
        return;
      }

      // Non-iOS: Use original optimized approach
      await unlockAudio();
      stopSpeaking(true);                     // gentle stop to prevent cutoff
      
      // Wait for gentle stop to complete (250ms)
      await new Promise(resolve => setTimeout(resolve, 250));

      const myGen = speakGenRef.current;      // snapshot generation

      const { audio, duration } = await speakWithOptimizedTTS(
        text,
        voice,
        speed
      );

      /* ❌ Someone called stopSpeaking() meanwhile → abort */
      if (myGen !== speakGenRef.current) {
        URL.revokeObjectURL(audio.src);       // tidy up
        return;
      }

      currentAudioRef.current = audio;

      audio.onended = () => {
        console.log('🔊 Audio ended, setting isSpeaking to false')
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      // Set speaking to true when audio actually starts playing
      audio.onplaying = () => {
        console.log('🔊 Audio started playing, setting isSpeaking to true')
        setIsSpeaking(true);
      };

      // Handle any playback errors
      audio.onerror = (error) => {
        console.error('🔊 Audio playback error:', error)
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      // Ensure audio is ready to play - optimized for speed
      audio.load();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000); // Reduced from 10s to 5s
        
        audio.oncanplaythrough = () => {
          clearTimeout(timeout);
          resolve(undefined);
        };
        audio.onerror = (event) => {
          clearTimeout(timeout);
          console.error('🔊 Audio load error:', audio.error?.message || 'Unknown error');
          reject(new Error(`Audio load error: ${audio.error?.message || 'Unknown error'}`));
        };
        
        // Check if already ready
        if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
      
      // Reduced delay for faster playback - optimized for speed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        await audio.play();
      } catch (playError) {
        console.error('🔊 Audio play error:', playError);
        console.error('🔊 Audio state at play error:', {
          readyState: audio.readyState,
          networkState: audio.networkState,
          error: audio.error,
          paused: audio.paused,
          currentTime: audio.currentTime,
          duration: audio.duration
        });
        throw new Error(`Failed to play audio: ${playError instanceof Error ? playError.message : 'Unknown error'}`);
      }
      
      // Non-iOS audio playback completed
      console.log('🔊 [Non-iOS] Audio playback initiated successfully');
    },
    [unlockAudio, stopSpeaking, speakWithOptimizedTTS, selectedVoice, isIOSDevice]
  );

  /* ------------------------------------------------------------------ */
  /*  PRE-CACHE INTRO MESSAGE                                           */
  /* ------------------------------------------------------------------ */
  const preCacheIntroMessage = useCallback(async () => {
    const introMessage = "Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!";
    
    try {
      console.log('🔄 Pre-caching intro message audio (not playing)...');
      
      // Generate TTS audio but don't play it - just cache it
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: introMessage,
          voice: selectedVoice,
          speed: 1.00
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate intro audio');
      }
      
      // The audio is now cached by the browser and/or our caching layer
      console.log('✅ Intro message audio pre-cached (not played)');
    } catch (error) {
      console.error('❌ Error pre-caching intro message:', error);
    }
  }, [selectedVoice]);

  /* ------------------------------------------------------------------ */
  /*  TEST VOICE                                                        */
  /* ------------------------------------------------------------------ */
  const testVoice = useCallback(
    async (voice: OpenAIVoice) => {
      try {
        await speakText(
          `Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!`,
          voice
        );
      } catch (err) {
        console.error('Voice test failed', err);
      }
    },
    [speakText]
  );

  /* ------------------------------------------------------------------ */
  /*  CLEAN-UP ON UNMOUNT                                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    return () => {
      stopSpeaking();
      audioCache.current.forEach(url => URL.revokeObjectURL(url));
      audioCache.current.clear();
    };
  }, [stopSpeaking]);

  /* ------------------------------------------------------------------ */
  /*  EXPORTED API                                                      */
  /* ------------------------------------------------------------------ */
  return {
    isSpeaking,
    selectedVoice,
    setSelectedVoice,
    speakText,
    stopSpeaking,
    testVoice,
    unlockAudio,
    preCacheIntroMessage,
  };
};
