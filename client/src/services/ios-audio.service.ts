// iOS-compatible audio service that handles autoplay restrictions
export class IOSAudioService {
  private static instance: IOSAudioService | null = null;
  private audioContext: AudioContext | null = null;
  private isUnlocked = false;
  private audioQueue: HTMLAudioElement[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  
  // Singleton pattern
  public static getInstance(): IOSAudioService {
    if (!IOSAudioService.instance) {
      IOSAudioService.instance = new IOSAudioService();
    }
    return IOSAudioService.instance;
  }
  
  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }
  
  // Detect iOS devices
  private isIOSDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // Check for iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    
    return isIOS || isIPadOS;
  }
  
  // Set up event listeners to unlock audio on user interaction
  private setupEventListeners(): void {
    const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
    
    const unlockAudio = () => {
      if (this.isUnlocked) return;
      
      console.log('🔓 Unlocking iOS audio on user interaction');
      this.unlockAudioContext();
      
      // Remove listeners after unlock
      unlockEvents.forEach(event => {
        document.removeEventListener(event, unlockAudio, { capture: true });
      });
    };
    
    // Add listeners to capture any user interaction
    unlockEvents.forEach(event => {
      document.addEventListener(event, unlockAudio, { capture: true, passive: true });
    });
  }
  
  // Unlock audio context for iOS
  private async unlockAudioContext(): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Create a silent buffer
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isUnlocked = true;
      console.log('🔓 iOS audio context unlocked successfully');
    } catch (error) {
      console.error('🔓 Failed to unlock iOS audio context:', error);
    }
  }
  
  // Check if audio is unlocked
  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }
  
  // Manually unlock audio (call this on user interaction)
  public async manualUnlock(): Promise<boolean> {
    if (this.isUnlocked) return true;
    
    try {
      await this.unlockAudioContext();
      return this.isUnlocked;
    } catch (error) {
      console.error('🔓 Manual unlock failed:', error);
      return false;
    }
  }
  
  // Get TTS audio from API
  private async getTTSAudio(text: string, voice: string = 'nova'): Promise<ArrayBuffer> {
    console.log('🔊 Getting TTS audio from API...');
    
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        model: 'tts-1',
        response_format: 'mp3',
        speed: 1.3, // Slightly faster for better UX
      }),
    });
    
    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.statusText}`);
    }
    
    return response.arrayBuffer();
  }
  
  // Create audio element with iOS-compatible settings
  private createAudioElement(audioBuffer: ArrayBuffer): HTMLAudioElement {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    
    const audio = new Audio(audioUrl);
    
    // iOS-specific audio settings
    if (this.isIOSDevice()) {
      audio.preload = 'auto';
      audio.controls = false;
      
      // Set audio session category for iOS
      if ('webkitAudioContext' in window) {
        try {
          (audio as any).webkitPreservesPitch = false;
        } catch (e) {
          // Ignore if not supported
        }
      }
    }
    
    return audio;
  }
  
  // Speak text with iOS compatibility
  public async speakText(
    text: string,
    options: {
      voice?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    const { voice = 'nova', onStart, onEnd, onError } = options;
    
    try {
      console.log(`🔊 Speaking text (iOS: ${this.isIOSDevice()}):`, text);
      
      // Stop current speech if playing
      this.stopSpeaking();
      
      // Check if audio is unlocked (required for iOS)
      if (this.isIOSDevice() && !this.isUnlocked) {
        console.warn('🔊 Audio not unlocked - attempting manual unlock');
        const unlocked = await this.manualUnlock();
        if (!unlocked) {
          throw new Error('Audio is locked. Please tap anywhere on the screen first.');
        }
      }
      
      // Get audio from TTS API
      const audioBuffer = await this.getTTSAudio(text, voice);
      
      // Create audio element
      const audio = this.createAudioElement(audioBuffer);
      this.currentAudio = audio;
      this.isSpeaking = true;
      
      // Set up event listeners
      audio.onloadstart = () => {
        console.log('🔊 Audio loading started');
      };
      
      audio.oncanplay = () => {
        console.log('🔊 Audio can play');
      };
      
      audio.onplay = () => {
        console.log('🔊 Audio playback started');
        onStart?.();
      };
      
      audio.onended = () => {
        console.log('🔊 Audio playback ended');
        this.isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(audio.src);
        onEnd?.();
      };
      
      audio.onerror = (event) => {
        console.error('🔊 Audio playback error:', event);
        this.isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(audio.src);
        onError?.(new Error('Audio playback failed'));
      };
      
      // For iOS, we need to play immediately after creating the audio element
      // to ensure it's within the user interaction context
      if (this.isIOSDevice()) {
        // Small delay to ensure audio is ready
        setTimeout(() => {
          audio.play().catch(error => {
            console.error('🔊 iOS audio play failed:', error);
            onError?.(error);
          });
        }, 100);
      } else {
        // For other platforms, play immediately
        await audio.play();
      }
      
    } catch (error) {
      console.error('🔊 TTS error:', error);
      this.isSpeaking = false;
      this.currentAudio = null;
      onError?.(error instanceof Error ? error : new Error('Unknown TTS error'));
    }
  }
  
  // Stop current speech
  public stopSpeaking(): void {
    if (this.currentAudio) {
      console.log('🔊 Stopping current audio');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
    this.isSpeaking = false;
  }
  
  // Check if currently speaking
  public isTTSSpeaking(): boolean {
    return this.isSpeaking;
  }
  
  // Clean up resources
  public cleanup(): void {
    this.stopSpeaking();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isUnlocked = false;
  }
}

// Export singleton instance
export const iosAudioService = IOSAudioService.getInstance();