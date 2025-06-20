// hooks/useVoice.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { OpenAIVoice } from '@/types/voice.types';

export const useVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoice>('shimmer');
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

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

  // Calculate speech duration using character count estimation
  const estimateDuration = useCallback((text: string): number => {
    // Average speaking rate: ~200-250 words per minute (faster)
    // Average word length: ~5 characters
    // Adding pauses for punctuation
    const wordsPerMinute = 225; // Increased from 175
    const charactersPerWord = 5;
    const wordsPerSecond = wordsPerMinute / 60;
    
    // Count words and add extra time for punctuation
    const wordCount = text.split(/\s+/).length;
    const punctuationCount = (text.match(/[.!?,:;]/g) || []).length;
    
    // Base duration + extra pause time for punctuation
    const baseDuration = wordCount / wordsPerSecond;
    const punctuationPause = punctuationCount * 0.2; // Reduced from 0.3 to 0.2 seconds
    
    return Math.max(1, baseDuration + punctuationPause);
  }, []);

  // Enhanced TTS with proper duration handling
  const speakWithStreamingTTS = useCallback(async (
    text: string, 
    voice: OpenAIVoice = selectedVoice,
    speed: number = 1.2 // Increased default speed from 1.0 to 1.2
  ) => {
    console.log('🔊 TTS Request:', { text: text.substring(0, 50), voice, speed });
    
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
      });

      if (!res.ok) {
        console.error(`TTS API error: ${res.status} ${res.statusText}`);
        throw new Error(`TTS error: ${res.status}`);
      }

      const blob = await res.blob();
      console.log('🔊 TTS blob size:', blob.size);

      if (blob.size === 0) {
        throw new Error('Empty audio response');
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      // Estimate duration while audio metadata loads
      const estimatedDuration = estimateDuration(text);
      console.log('🕐 Estimated duration:', estimatedDuration);

      return new Promise<{ audio: HTMLAudioElement; duration: number }>((resolve, reject) => {
        // Set up audio event handlers
        audio.onloadedmetadata = () => {
          const actualDuration = audio.duration || estimatedDuration;
          console.log('🕐 Audio metadata loaded, actual duration:', actualDuration);
          resolve({ audio, duration: actualDuration });
        };

        audio.onerror = (error) => {
          console.error('🔊 Audio error:', error);
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };

        // Fallback - if metadata doesn't load within 500ms, use estimation
        setTimeout(() => {
          if (audio.readyState < 1) {
            console.log('🕐 Using estimated duration due to metadata delay');
            resolve({ audio, duration: estimatedDuration });
          }
        }, 500);

        // Load the audio
        audio.load();
      });

    } catch (error) {
      console.error('🔊 TTS error:', error);
      throw error;
    }
  }, [selectedVoice, estimateDuration]);

  // Main speak function
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
      
      const result = await speakWithStreamingTTS(text, voice, speed);
      currentAudioRef.current = result.audio;

      // Set up audio end handler
      result.audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        URL.revokeObjectURL(result.audio.src);
      };

      // Start playback
      await result.audio.play();
      console.log('🔊 Audio playback started');

      return result;
    } catch (error) {
      setIsSpeaking(false);
      currentAudioRef.current = null;
      console.error('🔊 speakText error:', error);
      throw error;
    }
  }, [unlockAudio, stopSpeaking, speakWithStreamingTTS]);

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
    };
  }, [stopSpeaking]);

  return {
    isSpeaking,
    selectedVoice,
    setSelectedVoice,
    isVoiceInputActive,
    setIsVoiceInputActive,
    speakText,
    stopSpeaking,
    testVoice,
    unlockAudio
  };
};