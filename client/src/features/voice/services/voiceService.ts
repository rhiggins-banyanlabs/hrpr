import { TTSRequest, STTRequest, STTResponse, OpenAIVoice } from '../types/voice.types';
import { pronunciationService } from '@/services/pronunciation.service';

class VoiceService {
  async textToSpeech(request: TTSRequest): Promise<Blob> {
    // Apply pronunciation corrections before sending to TTS
    const correctedRequest = {
      ...request,
      text: pronunciationService.correctPronunciation(request.text)
    };
    
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(correctedRequest),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  }

  async speechToText(request: STTRequest): Promise<STTResponse> {
    const formData = new FormData();
    formData.append('audio', request.audio);
    
    if (request.model) formData.append('model', request.model);
    if (request.language) formData.append('language', request.language);
    if (request.prompt) formData.append('prompt', request.prompt);
    if (request.response_format) formData.append('response_format', request.response_format);
    if (request.temperature !== undefined) formData.append('temperature', request.temperature.toString());

    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`STT API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async playAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      
      // Preload the audio to prevent delays
      audio.preload = 'auto';
      
      // Set volume to ensure it's audible
      audio.volume = 0.8;
      
      let hasEnded = false;
      
      const cleanup = () => {
        if (!hasEnded) {
          hasEnded = true;
          URL.revokeObjectURL(url);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('canplaythrough', handleCanPlay);
        }
      };
      
      const handleEnded = () => {
        console.log('🔊 Audio playback completed');
        cleanup();
        resolve();
      };
      
      const handleError = (error: any) => {
        console.error('🔊 Audio playback error:', error);
        cleanup();
        reject(new Error('Audio playback failed'));
      };
      
      const handleCanPlay = () => {
        console.log('🔊 Audio ready to play');
        audio.play().catch((playError) => {
          console.error('🔊 Play error:', playError);
          cleanup();
          reject(playError);
        });
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplaythrough', handleCanPlay);
      
      // Load the audio
      audio.load();
      
      // Fallback timeout to prevent hanging
      setTimeout(() => {
        if (!hasEnded) {
          console.log('🔊 Audio playback timeout - forcing completion');
          cleanup();
          resolve();
        }
      }, 60000); // 60 second timeout
    });
  }

  async testVoice(voice: string, text?: string): Promise<void> {
    const testText = text || `Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!`;
    
    const audioBlob = await this.textToSpeech({
      text: testText,
      voice: voice as OpenAIVoice,
      model: 'tts-1', // Use standard model for consistent speed
      speed: 1.0 // Normal speed
    });
    
    await this.playAudio(audioBlob);
  }
}

export const voiceService = new VoiceService();
export default voiceService;