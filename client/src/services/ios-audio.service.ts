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
      console.log('🔓 Attempting to unlock iOS audio context...');
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔓 Created new audio context, state:', this.audioContext.state);
      }
      
      // Resume context if suspended (iOS often starts suspended)
      if (this.audioContext.state === 'suspended') {
        console.log('🔓 Audio context is suspended, resuming...');
        await this.audioContext.resume();
        console.log('🔓 Audio context resumed, new state:', this.audioContext.state);
      }
      
      // Create and play a silent buffer to fully unlock
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      // Wait a moment to ensure it's fully unlocked
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.isUnlocked = true;
      console.log('🔓 iOS audio context unlocked successfully, final state:', this.audioContext.state);
    } catch (error) {
      console.error('🔓 Failed to unlock iOS audio context:', error);
      this.isUnlocked = false;
      throw error;
    }
  }
  
  // Check if audio is unlocked
  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }
  
  // Manually unlock audio (call this on user interaction)
  public async manualUnlock(): Promise<boolean> {
    // Always try to unlock/refresh on iOS to ensure it's ready
    if (this.isIOSDevice()) {
      console.log('🔓 iOS: Refreshing audio unlock...');
      try {
        await this.unlockAudioContext();
        return this.isUnlocked;
      } catch (error) {
        console.error('🔓 Manual unlock failed:', error);
        return false;
      }
    }
    
    // For non-iOS, only unlock if not already unlocked
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
        speed: parseFloat(process.env.NEXT_PUBLIC_TTS_SPEED || '1.0')
      }),
    });
    
    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.statusText}`);
    }
    
    return response.arrayBuffer();
  }
  
  // Create audio element with iOS-compatible settings
  private async createAudioElement(audioBuffer: ArrayBuffer): Promise<HTMLAudioElement> {
    let audioBlob: Blob;
    
    // For iOS, convert MP3 to a more compatible format using FFmpeg
    if (this.isIOSDevice()) {
      try {
        console.log('🎵 Converting TTS audio for iOS playback...');
        console.log('🎵 Audio buffer size:', audioBuffer.byteLength, 'bytes');
        
        // Import audio converter dynamically to avoid SSR issues
        const { audioConverter } = await import('@/services/audio-converter.service');
        
        // Check if FFmpeg is ready
        const isFFmpegReady = audioConverter.isReady();
        console.log('🎵 FFmpeg ready status:', isFFmpegReady);
        
        if (!isFFmpegReady) {
          console.log('🎵 FFmpeg not ready, preloading...');
          try {
            await audioConverter.preload();
            console.log('🎵 FFmpeg preload completed successfully');
            
            // Double-check it's actually ready after preload
            const isNowReady = audioConverter.isReady();
            console.log('🎵 FFmpeg ready after preload:', isNowReady);
            
            if (!isNowReady) {
              throw new Error('FFmpeg failed to initialize after preload');
            }
          } catch (preloadError) {
            console.error('🎵 FFmpeg preload failed:', preloadError);
            throw new Error(`FFmpeg initialization failed: ${preloadError instanceof Error ? preloadError.message : String(preloadError)}`);
          }
        }
        
        // Create MP3 blob from buffer
        const mp3Blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        console.log('🎵 Created MP3 blob, size:', mp3Blob.size, 'bytes');
        
        // Convert MP3 to WAV for better iOS compatibility
        console.log('🎵 Starting MP3 to WAV conversion...');
        const wavBlob = await audioConverter.convertToWAV(mp3Blob, 'mp3');
        console.log('🎵 Conversion successful, WAV blob size:', wavBlob.size, 'bytes');
        
        audioBlob = wavBlob;
        console.log('✅ TTS audio converted to WAV for iOS');
      } catch (conversionError) {
        console.error('❌ TTS audio conversion failed:', conversionError);
        if (conversionError instanceof Error) {
          console.error('❌ Full conversion error details:', {
            name: conversionError.name,
            message: conversionError.message,
            stack: conversionError.stack
          });
        }
        
        // Fall back to original MP3
        console.log('⚠️ Falling back to original MP3 format');
        audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      }
    } else {
      // For non-iOS, use MP3 directly
      audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    }
    
    const audioUrl = URL.createObjectURL(audioBlob);
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
      
      // Ensure audio is unlocked (required for iOS)
      if (this.isIOSDevice()) {
        console.log('🔓 Ensuring audio is unlocked for iOS playback...');
        if (!this.isUnlocked) {
          console.warn('🔊 Audio not unlocked - attempting manual unlock');
          const unlocked = await this.manualUnlock();
          if (!unlocked) {
            throw new Error('Audio is locked. Please tap anywhere on the screen first.');
          }
        } else {
          // Even if marked as unlocked, refresh the audio context to be sure
          console.log('🔓 Refreshing audio context for reliable playback...');
          try {
            await this.manualUnlock(); // This will refresh the context
          } catch (refreshError) {
            console.warn('🔓 Audio context refresh failed:', refreshError);
          }
        }
      }
      
      // Get audio from TTS API
      const audioBuffer = await this.getTTSAudio(text, voice);
      
      // Create audio element (now async for conversion)
      const audio = await this.createAudioElement(audioBuffer);
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
      
      // Try to play the audio
      try {
        // For iOS, ensure audio context is running
        if (this.isIOSDevice() && this.audioContext) {
          if (this.audioContext.state === 'suspended') {
            console.log('🔊 Resuming suspended audio context before playback...');
            await this.audioContext.resume();
          }
        }
        
        // Play the audio
        console.log('🔊 Starting audio playback...');
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log('🔊 Audio playback started successfully');
        }
      } catch (playError: any) {
        console.error('🔊 Audio play failed:', playError);
        console.error('🔊 Error details:', {
          name: playError.name,
          message: playError.message,
          audioSrc: audio.src ? 'exists' : 'missing',
          audioState: this.audioContext?.state,
          isUnlocked: this.isUnlocked
        });
        
        // Special handling for NotAllowedError
        if (playError.name === 'NotAllowedError') {
          console.error('🔊 NotAllowedError: User interaction required or autoplay blocked');
          console.error('🔊 This usually means audio context needs user interaction');
          
          // Force reset audio unlock status
          this.isUnlocked = false;
          this.audioContext = null;
          
          const errorMessage = 'Audio playback blocked. Please tap the voice button again to enable audio.';
          onError?.(new Error(errorMessage));
          return;
        }
        
        // Clean up
        this.isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(audio.src);
        
        // Try to reset audio context for next attempt
        if (this.isIOSDevice()) {
          console.log('🔊 Resetting iOS audio for next attempt...');
          this.isUnlocked = false;
        }
        
        onError?.(playError instanceof Error ? playError : new Error('Audio playback failed'));
        return;
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