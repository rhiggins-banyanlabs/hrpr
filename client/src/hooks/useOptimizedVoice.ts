// hooks/useOptimizedVoice.ts  – leak-proof version
import { useState, useRef, useCallback, useEffect } from 'react';
import { OpenAIVoice } from '@/features/voice/types/voice.types';

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

  /* ------------------------------------------------------------------ */
  /*  HELPER: unlock audio (needed on iOS / Android)                    */
  /* ------------------------------------------------------------------ */
  const unlockAudio = useCallback(async () => {
    if (audioUnlockedRef.current) return;
    try {
      // Audio unlock is not critical - it's mainly for mobile browsers
      console.log('🔒 Audio unlock not needed on desktop');
      audioUnlockedRef.current = true; // Mark as unlocked anyway
    } catch (err) {
      console.log('🔒 Audio unlock not supported (this is normal)');
      audioUnlockedRef.current = true; // Mark as unlocked anyway
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /*  STOP CURRENT SPEECH                                               */
  /* ------------------------------------------------------------------ */
  const stopSpeaking = useCallback((gentle: boolean = false) => {
    console.log('🔊 stopSpeaking called', { gentle })
    speakGenRef.current += 1; // invalidate in-flight speakText calls
    
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
  }, []);

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
        // Add timeout for TTS API
        signal: AbortSignal.timeout(8000)
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
    ): Promise<{ audio: HTMLAudioElement; duration: number }> => {
      if (!text.trim()) throw new Error('No text provided for TTS');

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
        return { audio, duration };
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

      // Ensure audio is fully loaded before playing to prevent cutoff
      audio.load();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000);
        
        audio.oncanplaythrough = () => {
          clearTimeout(timeout);
          resolve(undefined);
        };
        audio.onerror = (event) => {
          clearTimeout(timeout);
          console.error('🔊 Audio load error event:', event);
          console.error('🔊 Audio error details:', {
            error: audio.error,
            networkState: audio.networkState,
            readyState: audio.readyState,
            src: audio.src
          });
          reject(new Error(`Audio load error: ${audio.error?.message || 'Unknown error'}`));
        };
        
        // Check if already ready
        if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
      
      // Small delay to ensure audio buffer is stable
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
      
      return { audio, duration };
    },
    [unlockAudio, stopSpeaking, speakWithOptimizedTTS]
  );

  /* ------------------------------------------------------------------ */
  /*  PRE-CACHE INTRO MESSAGE                                           */
  /* ------------------------------------------------------------------ */
  const preCacheIntroMessage = useCallback(async () => {
    const introMessage = "Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!";
    
    try {
      console.log('🔄 Pre-caching intro message...');
      await speakWithOptimizedTTS(introMessage, selectedVoice, 1.00);
      console.log('✅ Intro message pre-cached successfully');
    } catch (error) {
      console.error('❌ Error pre-caching intro message:', error);
    }
  }, [speakWithOptimizedTTS, selectedVoice]);

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
