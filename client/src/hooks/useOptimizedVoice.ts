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
      const dummy = new Audio();
      dummy.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAAAAAAAAAAAAAAAAAAAAAZGF0YQAAAAA=';
      dummy.volume = 0;
      await dummy.play();
      audioUnlockedRef.current = true;
      console.log('🔓 Audio unlocked');
    } catch (err) {
      console.log('🔒 Audio unlock failed:', err);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /*  STOP CURRENT SPEECH                                               */
  /* ------------------------------------------------------------------ */
  const stopSpeaking = useCallback(() => {
    speakGenRef.current += 1; // invalidate in-flight speakText calls
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
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
      speed: number = 1.0
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
      stopSpeaking();                         // cancel anything playing

      const myGen = speakGenRef.current;      // snapshot generation

      setIsSpeaking(true);
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
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      // Ensure audio is ready before playing to prevent cutoff
      audio.load();
      await new Promise(resolve => {
        audio.oncanplaythrough = resolve;
        if (audio.readyState >= 3) resolve(undefined); // Already ready
      });
      
      await audio.play();
      return { audio, duration };
    },
    [unlockAudio, stopSpeaking, speakWithOptimizedTTS]
  );

  /* ------------------------------------------------------------------ */
  /*  PRE-CACHE INTRO MESSAGE                                           */
  /* ------------------------------------------------------------------ */
  const preCacheIntroMessage = useCallback(async () => {
    const introMessage = "Hi! I'm Harper, your conference assistant. How can I help you today?";
    
    try {
      console.log('🔄 Pre-caching intro message...');
      await speakWithOptimizedTTS(introMessage, selectedVoice, 1.0);
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
          `Hi! I'm Harper, your conference assistant. How can I help you today?`,
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
