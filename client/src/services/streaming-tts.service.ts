// Streaming TTS service for real-time voice generation
export class StreamingTTSService {
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying = false;
  private currentIndex = 0;

  async generateAndPlayStreaming(
    text: string, 
    voice: string = 'shimmer',
    onStart?: () => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      onStart?.();
      
      // Split text into sentences for faster TTS
      const sentences = this.splitIntoSentences(text);
      console.log(`🔊 Streaming TTS: Processing ${sentences.length} sentences`);
      
      // Reset queue
      this.audioQueue = [];
      this.currentIndex = 0;
      
      // Generate TTS for each sentence in parallel
      const ttsPromises = sentences.map(async (sentence, index) => {
        if (!sentence.trim()) return null;
        
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: sentence.trim(), 
              voice, 
              speed: 1.05, 
              model: 'tts-1' 
            }),
            signal: AbortSignal.timeout(5000)
          });
          
          if (!response.ok) throw new Error(`TTS failed: ${response.status}`);
          
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          
          // Preload the audio with better buffering
          return new Promise<{ audio: HTMLAudioElement; index: number }>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Audio preload timeout')), 8000);
            
            audio.oncanplaythrough = () => {
              clearTimeout(timeout);
              resolve({ audio, index });
            };
            audio.onerror = (e) => {
              clearTimeout(timeout);
              reject(e);
            };
            
            // Check if already ready
            if (audio.readyState >= 4) {
              clearTimeout(timeout);
              resolve({ audio, index });
            } else {
              audio.load();
            }
          });
        } catch (error) {
          console.error(`❌ TTS failed for sentence ${index}:`, error);
          return null;
        }
      });
      
      // Start playing as soon as first audio is ready
      let hasStartedPlaying = false;
      
      for (const promise of ttsPromises) {
        try {
          const result = await promise;
          if (!result) continue;
          
          // Add to queue in correct order
          this.audioQueue[result.index] = result.audio;
          
          // Start playing if we haven't started yet and we have the first audio
          if (!hasStartedPlaying && result.index === 0) {
            hasStartedPlaying = true;
            await this.playQueue();
          }
        } catch (error) {
          console.error('❌ Error processing TTS sentence:', error);
        }
      }
      
      // If we haven't started playing yet, start now
      if (!hasStartedPlaying) {
        await this.playQueue();
      }
      
      onComplete?.();
    } catch (error) {
      console.error('❌ Streaming TTS error:', error);
      onComplete?.();
      throw error;
    }
  }
  
  private splitIntoSentences(text: string): string[] {
    // Split on sentence endings but keep them attached
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0);
  }
  
  private async playQueue(): Promise<void> {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    
    while (this.currentIndex < this.audioQueue.length) {
      const audio = this.audioQueue[this.currentIndex];
      
      if (audio) {
        try {
          await this.playAudio(audio);
        } catch (error) {
          console.error(`❌ Error playing audio ${this.currentIndex}:`, error);
        }
        this.currentIndex++;
      } else {
        // Wait for missing audio segment before continuing
        console.log(`⏳ Waiting for audio segment ${this.currentIndex}...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        // Don't increment index - keep waiting for this segment
        
        // Timeout after 5 seconds to prevent infinite wait
        const startWait = Date.now();
        while (!this.audioQueue[this.currentIndex] && (Date.now() - startWait) < 5000) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // If still no audio after timeout, skip this segment
        if (!this.audioQueue[this.currentIndex]) {
          console.warn(`⚠️ Skipping missing audio segment ${this.currentIndex} after timeout`);
          this.currentIndex++;
        }
      }
    }
    
    this.isPlaying = false;
  }
  
  private playAudio(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = reject;
      audio.play().catch(reject);
    });
  }
  
  stop(): void {
    // Stop current audio and clear queue
    this.audioQueue.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    
    this.audioQueue = [];
    this.currentIndex = 0;
    this.isPlaying = false;
  }
}