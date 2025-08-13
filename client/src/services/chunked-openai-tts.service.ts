// Chunked OpenAI TTS Service - iOS workaround implementation
export class ChunkedOpenAITTSService {
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private readonly MAX_CHUNK_LENGTH = 100; // Characters per TTS request
  private readonly isiOS: boolean;
  
  constructor() {
    this.isiOS = this.detectiOS();
    console.log('🔊 [CHUNKED-TTS] Initialized for', this.isiOS ? 'iOS' : 'non-iOS');
  }
  
  private detectiOS(): boolean {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const maxTouchPoints = navigator.maxTouchPoints;
    
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;
    return isIOS || isIPadOS;
  }
  
  // Main method - handles chunking and playback
  async playText(text: string, voice: string = 'nova', onStart?: () => void, onEnd?: () => void, onError?: (error: Error) => void): Promise<void> {
    try {
      console.log('🔊 [CHUNKED-TTS] Starting chunked playback for:', text.substring(0, 50));
      
      // Stop any current playback
      this.stopPlayback();
      
      onStart?.();
      
      if (this.isiOS && text.length > 200) {
        console.log('🔊 [CHUNKED-TTS] Long text on iOS - using sentence-by-sentence chunking');
        await this.playLongTextWithChunking(text, voice);
      } else {
        console.log('🔊 [CHUNKED-TTS] Short text or non-iOS - using single request');
        await this.playSingleRequest(text, voice);
      }
      
      onEnd?.();
    } catch (error) {
      console.error('🔊 [CHUNKED-TTS] Playback failed:', error);
      onError?.(error instanceof Error ? error : new Error('TTS playback failed'));
      throw error;
    }
  }
  
  // For long text: Split into sentences and make separate TTS requests
  private async playLongTextWithChunking(text: string, voice: string): Promise<void> {
    const sentences = this.splitIntoSentences(text);
    console.log(`🔊 [CHUNKED-TTS] Split into ${sentences.length} sentences`);
    
    // Queue all TTS requests
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (sentence.trim()) {
        console.log(`🔊 [CHUNKED-TTS] Queueing sentence ${i + 1}/${sentences.length}: "${sentence.substring(0, 30)}..."`);
        await this.queueAudioChunk(sentence.trim(), voice);
      }
    }
    
    // Start playback queue
    if (!this.isPlaying) {
      this.playNextChunk();
    }
    
    // Wait for all chunks to complete
    return new Promise((resolve, reject) => {
      const checkComplete = () => {
        if (!this.isPlaying && this.audioQueue.length === 0) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      // Start checking after a short delay
      setTimeout(checkComplete, 500);
      
      // Timeout protection
      setTimeout(() => reject(new Error('Chunked playback timeout')), 30000);
    });
  }
  
  // For short text: Single request
  private async playSingleRequest(text: string, voice: string): Promise<void> {
    console.log('🔊 [CHUNKED-TTS] Making single TTS request');
    
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice: voice,
        model: 'tts-1',
        response_format: 'mp3',
        speed: 1.3
      }),
    });
    
    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.status}`);
    }
    
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    // Apply iOS timeout prevention
    if (this.isiOS) {
      this.addTimeoutPrevention(audio);
    }
    
    // Play and wait for completion
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (event) => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  }
  
  // Split text into sentences for chunking
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.length <= this.MAX_CHUNK_LENGTH) {
        chunks.push(sentence);
      } else {
        // Further split long sentences at commas or pauses
        const parts = sentence.split(/[,;]/);
        let currentChunk = '';
        
        for (const part of parts) {
          if ((currentChunk + part).length <= this.MAX_CHUNK_LENGTH) {
            currentChunk += part;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = part;
          }
        }
        if (currentChunk) chunks.push(currentChunk);
      }
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }
  
  // Queue individual audio chunk
  private async queueAudioChunk(text: string, voice: string): Promise<void> {
    try {
      console.log(`🔊 [CHUNKED-TTS] Creating TTS for chunk: "${text.substring(0, 30)}..."`);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: voice,
          model: 'tts-1',
          response_format: 'mp3',
          speed: 1.3
        }),
      });
      
      if (!response.ok) {
        throw new Error(`TTS API failed for chunk: ${response.status}`);
      }
      
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      // Apply iOS fixes
      if (this.isiOS) {
        this.addTimeoutPrevention(audio);
      }
      
      // Add to queue
      this.audioQueue.push(audio);
      
      console.log(`🔊 [CHUNKED-TTS] Queued audio chunk, queue length: ${this.audioQueue.length}`);
      
    } catch (error) {
      console.error('🔊 [CHUNKED-TTS] Failed to queue audio chunk:', error);
      throw error;
    }
  }
  
  // Play next chunk in queue
  private playNextChunk(): void {
    if (this.audioQueue.length === 0) {
      console.log('🔊 [CHUNKED-TTS] Queue empty, playback complete');
      this.isPlaying = false;
      this.currentAudio = null;
      return;
    }
    
    this.isPlaying = true;
    const audio = this.audioQueue.shift()!;
    this.currentAudio = audio;
    
    console.log(`🔊 [CHUNKED-TTS] Playing chunk, ${this.audioQueue.length} remaining in queue`);
    
    audio.addEventListener('ended', () => {
      console.log('🔊 [CHUNKED-TTS] Chunk completed');
      URL.revokeObjectURL(audio.src); // Clean up
      setTimeout(() => this.playNextChunk(), 50); // Small gap between chunks
    });
    
    audio.addEventListener('error', (e) => {
      console.error('🔊 [CHUNKED-TTS] Chunk playback error:', e);
      URL.revokeObjectURL(audio.src);
      setTimeout(() => this.playNextChunk(), 100); // Skip to next chunk
    });
    
    // Ensure audio is ready before playing
    audio.addEventListener('canplaythrough', () => {
      audio.play().catch(e => {
        console.error('🔊 [CHUNKED-TTS] Chunk play failed:', e);
        setTimeout(() => this.playNextChunk(), 100);
      });
    }, { once: true });
    
    audio.load();
  }
  
  // iOS-specific timeout prevention
  private addTimeoutPrevention(audio: HTMLAudioElement): void {
    let timeoutPrevention: NodeJS.Timeout | null = null;
    
    audio.addEventListener('play', () => {
      console.log('🔊 [CHUNKED-TTS] Starting iOS timeout prevention');
      timeoutPrevention = setInterval(() => {
        if (!audio.paused && audio.currentTime > 0) {
          // Prevent iOS timeout by tiny seek
          const currentTime = audio.currentTime;
          audio.currentTime = Math.min(currentTime + 0.001, audio.duration || currentTime);
        }
      }, 8000); // Every 8 seconds
    });
    
    audio.addEventListener('ended', () => {
      if (timeoutPrevention) {
        clearInterval(timeoutPrevention);
        timeoutPrevention = null;
      }
    });
    
    audio.addEventListener('error', () => {
      if (timeoutPrevention) {
        clearInterval(timeoutPrevention);
        timeoutPrevention = null;
      }
    });
  }
  
  // Stop all playback
  public stopPlayback(): void {
    console.log('🔊 [CHUNKED-TTS] Stopping all playback');
    
    this.isPlaying = false;
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
    
    // Clean up queue
    this.audioQueue.forEach(audio => {
      URL.revokeObjectURL(audio.src);
    });
    this.audioQueue = [];
  }
}

// Export singleton instance
export const chunkedOpenAITTS = new ChunkedOpenAITTSService();