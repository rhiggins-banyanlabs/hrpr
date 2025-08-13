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
      console.log('🔊 [CHUNKED-TTS] Text length:', text.length, 'iOS:', this.isiOS);
      
      // Stop any current playback
      this.stopPlayback();
      
      onStart?.();
      
      if (this.isiOS && text.length > 200) {
        console.log('🔊 [CHUNKED-TTS] Long text on iOS - attempting sentence-by-sentence chunking');
        try {
          await this.playLongTextWithChunking(text, voice);
        } catch (chunkingError) {
          console.warn('🔊 [CHUNKED-TTS] Chunking failed, falling back to single request:', chunkingError);
          // Fallback to single request if chunking fails
          await this.playSingleRequest(text, voice);
        }
      } else {
        console.log('🔊 [CHUNKED-TTS] Short text or non-iOS - using single request');
        await this.playSingleRequest(text, voice);
      }
      
      onEnd?.();
    } catch (error) {
      console.error('🔊 [CHUNKED-TTS] All playback methods failed:', error);
      onError?.(error instanceof Error ? error : new Error('TTS playback failed'));
      throw error;
    }
  }
  
  // For long text: Split into sentences and make separate TTS requests
  private async playLongTextWithChunking(text: string, voice: string): Promise<void> {
    const sentences = this.splitIntoSentences(text);
    console.log(`🔊 [CHUNKED-TTS] Split into ${sentences.length} sentences`);
    
    if (sentences.length === 0) {
      throw new Error('No sentences found to chunk');
    }
    
    let successfulChunks = 0;
    
    // Queue all TTS requests with error recovery
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (sentence.trim()) {
        console.log(`🔊 [CHUNKED-TTS] Queueing sentence ${i + 1}/${sentences.length}: "${sentence.substring(0, 30)}..."`);
        try {
          await this.queueAudioChunk(sentence.trim(), voice);
          successfulChunks++;
        } catch (chunkError) {
          console.error(`🔊 [CHUNKED-TTS] Failed to queue chunk ${i + 1}:`, chunkError);
          // Continue trying other chunks instead of failing completely
          continue;
        }
      }
    }
    
    if (successfulChunks === 0) {
      throw new Error('Failed to queue any audio chunks');
    }
    
    console.log(`🔊 [CHUNKED-TTS] Successfully queued ${successfulChunks}/${sentences.length} chunks`);
    
    // Start playback queue
    if (!this.isPlaying && this.audioQueue.length > 0) {
      this.playNextChunk();
    }
    
    // Wait for all chunks to complete
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkComplete = () => {
        const elapsed = Date.now() - startTime;
        
        if (!this.isPlaying && this.audioQueue.length === 0) {
          console.log(`🔊 [CHUNKED-TTS] All chunks completed in ${elapsed}ms`);
          resolve();
        } else if (elapsed > 30000) {
          console.error('🔊 [CHUNKED-TTS] Timeout waiting for chunks to complete');
          this.stopPlayback(); // Clean up
          reject(new Error('Chunked playback timeout'));
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      // Start checking after a short delay
      setTimeout(checkComplete, 500);
    });
  }
  
  // For short text: Single request
  private async playSingleRequest(text: string, voice: string): Promise<void> {
    console.log('🔊 [CHUNKED-TTS] Making single TTS request');
    
    try {
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
        const errorText = await response.text();
        console.error('🔊 [CHUNKED-TTS] TTS API error:', response.status, errorText);
        throw new Error(`TTS API failed: ${response.status} - ${errorText}`);
      }
      
      const blob = await response.blob();
      console.log('🔊 [CHUNKED-TTS] Got audio blob, size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('Received empty audio blob from TTS API');
      }
      
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      // Apply iOS timeout prevention
      if (this.isiOS) {
        this.addTimeoutPrevention(audio);
      }
      
      // Play and wait for completion
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.error('🔊 [CHUNKED-TTS] Single request timeout');
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback timeout'));
        }, 15000);
        
        audio.onended = () => {
          console.log('🔊 [CHUNKED-TTS] Single request audio ended');
          clearTimeout(timeoutId);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (event) => {
          console.error('🔊 [CHUNKED-TTS] Single request audio error:', event);
          clearTimeout(timeoutId);
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        
        audio.oncanplaythrough = () => {
          console.log('🔊 [CHUNKED-TTS] Single request audio ready, starting playback');
          audio.play().catch(playError => {
            console.error('🔊 [CHUNKED-TTS] Single request play failed:', playError);
            clearTimeout(timeoutId);
            URL.revokeObjectURL(audioUrl);
            reject(playError);
          });
        };
        
        audio.load();
      });
    } catch (error) {
      console.error('🔊 [CHUNKED-TTS] Single request failed:', error);
      throw error;
    }
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
        signal: AbortSignal.timeout(10000) // 10 second timeout per chunk
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔊 [CHUNKED-TTS] TTS API failed for chunk: ${response.status} - ${errorText}`);
        throw new Error(`TTS API failed for chunk: ${response.status} - ${errorText}`);
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        console.error('🔊 [CHUNKED-TTS] Received empty blob for chunk');
        throw new Error('Received empty audio blob for chunk');
      }
      
      console.log(`🔊 [CHUNKED-TTS] Got chunk audio blob, size: ${blob.size} bytes`);
      
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      // Preload the audio
      audio.preload = 'auto';
      audio.load();
      
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
    
    // Set up event handlers
    const onEnded = () => {
      console.log('🔊 [CHUNKED-TTS] Chunk completed');
      URL.revokeObjectURL(audio.src);
      // Continue to next chunk
      setTimeout(() => this.playNextChunk(), 50);
    };
    
    const onError = (e: Event) => {
      console.error('🔊 [CHUNKED-TTS] Chunk playback error:', e);
      console.error('🔊 [CHUNKED-TTS] Audio state:', {
        readyState: audio.readyState,
        networkState: audio.networkState,
        error: audio.error
      });
      URL.revokeObjectURL(audio.src);
      // Skip to next chunk on error
      setTimeout(() => this.playNextChunk(), 100);
    };
    
    audio.addEventListener('ended', onEnded, { once: true });
    audio.addEventListener('error', onError, { once: true });
    
    // Try to play immediately if already loaded, otherwise wait for canplaythrough
    if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
      console.log('🔊 [CHUNKED-TTS] Audio already loaded, playing immediately');
      audio.play().catch(e => {
        console.error('🔊 [CHUNKED-TTS] Immediate play failed:', e);
        onError(e);
      });
    } else {
      console.log('🔊 [CHUNKED-TTS] Waiting for audio to load...');
      
      const onCanPlay = () => {
        console.log('🔊 [CHUNKED-TTS] Audio ready, starting playback');
        audio.play().catch(e => {
          console.error('🔊 [CHUNKED-TTS] Delayed play failed:', e);
          onError(e);
        });
      };
      
      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      
      // Fallback timeout in case canplaythrough never fires
      const fallbackTimeout = setTimeout(() => {
        console.warn('🔊 [CHUNKED-TTS] canplaythrough timeout, trying to play anyway');
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.play().catch(e => {
          console.error('🔊 [CHUNKED-TTS] Fallback play failed:', e);
          onError(e);
        });
      }, 3000);
      
      audio.addEventListener('canplaythrough', () => {
        clearTimeout(fallbackTimeout);
      }, { once: true });
      
      audio.load();
    }
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