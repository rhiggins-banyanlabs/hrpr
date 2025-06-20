// hooks/useOptimizedVoice.ts - FASTER TTS VERSION
import { useState, useRef, useCallback, useEffect } from 'react';
import { OpenAIVoice } from '@/types/voice.types';

export const useOptimizedVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoice>('shimmer');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioCache = useRef<Map<string, string>>(new Map()); // Cache audio URLs

  // Unlock audio on user interaction (mobile requirement)
  const unlockAudio = useCallback(async () => {
    if (audioUnlockedRef.current) return;
    
    try {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAAAAAAAAAAAAAAAAAAAAAZGF0YQAAAAA=';
      audio.volume = 0;
      await audio.play();
      audioUnlockedRef.current = true;
      console.log('🔓 Audio unlocked');
    } catch (error) {
      console.log('🔒 Audio unlock failed:', error);
    }
  }, []);

  // Stop current speech
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Calculate speech duration using character count estimation (much faster than waiting for metadata)
  const estimateDuration = useCallback((text: string): number => {
    const wordsPerMinute = 250; // Faster speech
    const charactersPerWord = 5;
    const wordsPerSecond = wordsPerMinute / 60;
    
    const wordCount = text.split(/\s+/).length;
    const punctuationCount = (text.match(/[.!?,:;]/g) || []).length;
    
    const baseDuration = wordCount / wordsPerSecond;
    const punctuationPause = punctuationCount * 0.15; // Reduced pause
    
    return Math.max(1, baseDuration + punctuationPause);
  }, []);

  // OPTIMIZED: Parallel TTS with instant response and caching
  const speakWithOptimizedTTS = useCallback(async (
    text: string, 
    voice: OpenAIVoice = selectedVoice,
    speed: number = 1.3 // Faster default speed
  ) => {
    console.log('🔊 Optimized TTS Request:', { text: text.substring(0, 50), voice, speed });
    
    // Check cache first
    const cacheKey = `${text}-${voice}-${speed}`;
    if (audioCache.current.has(cacheKey)) {
      console.log('🚀 Using cached audio');
      const cachedUrl = audioCache.current.get(cacheKey)!;
      const audio = new Audio(cachedUrl);
      const estimatedDuration = estimateDuration(text);
      return { audio, duration: estimatedDuration };
    }
    
    try {
      // Start TTS request
      const ttsPromise = fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voice, 
          speed,
          model: 'tts-1' // Use faster model instead of tts-1-hd
        }),
      });

      // Get estimated duration immediately (don't wait for TTS)
      const estimatedDuration = estimateDuration(text);
      console.log('🕐 Estimated duration:', estimatedDuration);

      // Wait for TTS to complete
      const res = await ttsPromise;
      
      if (!res.ok) {
        console.error(`TTS API error: ${res.status} ${res.statusText}`);
        throw new Error(`TTS error: ${res.status}`);
      }

      const blob = await res.blob();
      console.log('🔊 TTS Success:', { voice, audioSize: blob.size });

      if (blob.size === 0) {
        throw new Error('Empty audio response');
      }

      const audioUrl = URL.createObjectURL(blob);
      
      // Cache the audio URL
      audioCache.current.set(cacheKey, audioUrl);
      
      // Clean cache if too large (keep last 20 items)
      if (audioCache.current.size > 20) {
        const entries = Array.from(audioCache.current.entries());
        audioCache.current.clear();
        entries.slice(-10).forEach(([key, value]) => {
          audioCache.current.set(key, value);
        });
      }

      const audio = new Audio(audioUrl);
      
      // Return immediately with estimated duration (don't wait for metadata)
      return { audio, duration: estimatedDuration };

    } catch (error) {
      console.error('🔊 TTS error:', error);
      throw error;
    }
  }, [selectedVoice, estimateDuration]);

  // OPTIMIZED: Main speak function with instant start
  const speakText = useCallback(async (
    text: string,
    voice?: OpenAIVoice,
    speed?: number
  ): Promise<{ audio: HTMLAudioElement; duration: number }> => {
    console.log('🗣️ speakText called:', { text: text.substring(0, 50), voice, speed });
    
    if (!text?.trim()) {
      throw new Error('No text provided for TTS');
    }

    // Unlock audio if needed
    await unlockAudio();

    // Stop any current speech
    stopSpeaking();

    try {
      setIsSpeaking(true);
      
      // Get audio and estimated duration immediately
      const result = await speakWithOptimizedTTS(text, voice, speed);
      currentAudioRef.current = result.audio;

      // Set up audio end handler
      result.audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        // Don't revoke URL immediately to keep in cache
      };

      // Start playback immediately
      await result.audio.play();
      console.log('🔊 Audio playback started');

      return result;
    } catch (error) {
      setIsSpeaking(false);
      currentAudioRef.current = null;
      console.error('🔊 speakText error:', error);
      throw error;
    }
  }, [unlockAudio, stopSpeaking, speakWithOptimizedTTS]);

  // Test voice function
  const testVoice = useCallback(async (voice: OpenAIVoice) => {
    const testText = `Hi! I'm Connie speaking with the ${voice} voice. How do I sound?`;
    try {
      await speakText(testText, voice);
    } catch (error) {
      console.error('Voice test failed:', error);
    }
  }, [speakText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      // Clean up cached URLs
      audioCache.current.forEach(url => URL.revokeObjectURL(url));
      audioCache.current.clear();
    };
  }, [stopSpeaking]);

  return {
    isSpeaking,
    selectedVoice,
    setSelectedVoice,
    speakText,
    stopSpeaking,
    testVoice,
    unlockAudio
  };
};