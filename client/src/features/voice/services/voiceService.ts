import { TTSRequest, STTRequest, STTResponse } from '../types/voice.types';

class VoiceService {
  async textToSpeech(request: TTSRequest): Promise<Blob> {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
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
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  }

  async testVoice(voice: string, text?: string): Promise<void> {
    const testText = text || `Hi! I'm Harper, your conference assistant. How can I help? Feel free to share your name if you'd like a more personal experience!`;
    
    const audioBlob = await this.textToSpeech({
      text: testText,
      voice: voice as any,
      model: 'tts-1-hd'
    });
    
    await this.playAudio(audioBlob);
  }
}

export const voiceService = new VoiceService();
export default voiceService;