// TTS Orchestrator Service - Clean async management of filler + main responses
import { IntentDetectorService } from './intent-detector.service';

interface TTSRequest {
  text: string;
  isFiller?: boolean;
  voice?: string;
  speed?: number;
}

interface TTSResponse {
  audio: HTMLAudioElement;
  duration: number;
}

export class TTSOrchestratorService {
  private isProcessing = false;
  private currentAudio: HTMLAudioElement | null = null;
  private speakTextFunction: ((text: string, voice?: string, speed?: number) => Promise<TTSResponse>) | null = null;

  // Initialize with the speakText function from useOptimizedVoice
  initialize(speakTextFn: (text: string, voice?: string, speed?: number) => Promise<TTSResponse>) {
    this.speakTextFunction = speakTextFn;
  }

  // Main method - handles filler + main response sequence
  async speakWithFiller(userQuery: string, mainResponse: string, voice?: string, speed?: number): Promise<void> {
    if (this.isProcessing) {
      console.log('🔄 TTS Orchestrator busy, skipping request');
      return;
    }

    if (!this.speakTextFunction) {
      console.error('❌ TTS Orchestrator not initialized');
      return;
    }

    this.isProcessing = true;
    
    try {
      // Step 1: Get and play filler response immediately
      const fillerResponse = IntentDetectorService.getFillerResponse(userQuery);
      
      if (fillerResponse) {
        console.log('🎤 TTS Orchestrator: Playing filler response:', fillerResponse);
        await this.playTTS(fillerResponse, voice, speed, true);
        console.log('✅ TTS Orchestrator: Filler response completed');
        
        // Small pause between filler and main response for natural flow
        await this.delay(200);
      }

      // Step 2: Play main response
      if (mainResponse && mainResponse.trim()) {
        console.log('🎤 TTS Orchestrator: Playing main response');
        await this.playTTS(mainResponse, voice, speed, false);
        console.log('✅ TTS Orchestrator: Main response completed');
      }

    } catch (error) {
      console.error('❌ TTS Orchestrator error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Play just the main response without filler
  async speakOnly(text: string, voice?: string, speed?: number): Promise<void> {
    if (!this.speakTextFunction) {
      console.error('❌ TTS Orchestrator not initialized');
      return;
    }

    try {
      await this.playTTS(text, voice, speed, false);
    } catch (error) {
      console.error('❌ TTS Orchestrator error:', error);
    }
  }

  // Internal method to play TTS and wait for completion
  private async playTTS(text: string, voice?: string, speed?: number, isFiller: boolean = false): Promise<void> {
    if (!this.speakTextFunction) {
      throw new Error('TTS function not initialized');
    }

    const label = isFiller ? 'filler' : 'main';
    console.log(`🔊 Playing ${label} TTS: "${text.substring(0, 50)}..."`);

    try {
      const result = await this.speakTextFunction(text, voice, speed);
      
      if (result && result.audio) {
        this.currentAudio = result.audio;
        
        // Wait for audio to actually complete playing
        await this.waitForAudioCompletion(result.audio);
        
        this.currentAudio = null;
        console.log(`✅ ${label} TTS completed successfully`);
      }
    } catch (error) {
      console.error(`❌ ${label} TTS failed:`, error);
      throw error;
    }
  }

  // Wait for audio element to finish playing
  private async waitForAudioCompletion(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        clearTimeout(timeoutId);
      };

      const onEnded = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Event) => {
        cleanup();
        reject(error);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      // Fallback timeout (estimated duration + buffer)
      const timeoutId = setTimeout(() => {
        cleanup();
        console.log('⏰ Audio completion timeout - assuming finished');
        resolve();
      }, 30000); // 30 second max timeout
    });
  }

  // Stop current playback
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isProcessing = false;
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check if currently processing
  get busy(): boolean {
    return this.isProcessing;
  }
}

// Export singleton instance
export const ttsOrchestrator = new TTSOrchestratorService();