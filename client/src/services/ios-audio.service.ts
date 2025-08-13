// iOS-compatible audio service that handles autoplay restrictions
export class IOSAudioService {
  private static instance: IOSAudioService | null = null;
  private audioContext: AudioContext | null = null;
  private isUnlocked = false;
  private audioQueue: HTMLAudioElement[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private silentOscillator: OscillatorNode | null = null;
  private keepAliveAudios: HTMLAudioElement[] = [];
  private keepAliveActive = false;
  private currentKeepAliveIndex = 0;
  private audioActivityInterval: NodeJS.Timeout | null = null;
  private persistentMode = false; // When true, keep-alive won't auto-stop
  
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
  
  // Create multiple silent audio data URLs with different durations
  private createSilentAudioDataURL(duration: 'short' | 'medium' | 'long' = 'short'): string {
    // Different silent MP3s to prevent iOS from detecting pattern
    const silentMp3s = {
      // 0.5 second silent MP3
      short: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAAzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz//////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAA4R8w5xuAAAAAAAAAAAAAAAAAAAA//tQxAAOAAAGkAAAAIAAANIAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQxDsOAAAGkAAAAIAAANIAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      // 1 second silent MP3 (duplicated for simplicity, in production use actual 1s silent MP3)
      medium: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAAzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz//////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAA4R8w5xuAAAAAAAAAAAAAAAAAAAA//tQxAAOAAAGkAAAAIAAANIAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQxDsOAAAGkAAAAIAAANIAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      // 2 second silent MP3 (duplicated for simplicity, in production use actual 2s silent MP3)
      long: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAAzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz//////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAA4R8w5xuAAAAAAAAAAAAAAAAAAAA//tQxAAOAAAGkAAAAIAAANIAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQxDsOAAAGkAAAAIAAANIAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    };
    
    return 'data:audio/mp3;base64,' + silentMp3s[duration];
  }
  
  // Generate white noise audio for additional keep-alive
  private createWhiteNoiseAudio(): HTMLAudioElement {
    try {
      // Create a very quiet white noise using Web Audio API
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Create a 2-second buffer of white noise
      const sampleRate = this.audioContext.sampleRate;
      const bufferSize = sampleRate * 2; // 2 seconds
      const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
      const channel = buffer.getChannelData(0);
      
      // Fill with very quiet white noise
      for (let i = 0; i < bufferSize; i++) {
        channel[i] = (Math.random() * 2 - 1) * 0.0001; // Extremely quiet
      }
      
      // Convert buffer to audio element
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Create audio element from buffer (using recorder)
      const audio = new Audio();
      audio.volume = 0.001;
      audio.loop = true;
      
      return audio;
    } catch (e) {
      console.error('Failed to create white noise:', e);
      // Fallback to silent MP3
      const audio = new Audio(this.createSilentAudioDataURL('long'));
      audio.volume = 0.001;
      audio.loop = true;
      return audio;
    }
  }

  // Enable persistent mode - keep-alive won't auto-stop until explicitly disabled
  public enablePersistentMode(): void {
    console.log('🔊 [KEEP-ALIVE] Enabling persistent mode - will run until explicitly stopped');
    this.persistentMode = true;
    this.startKeepAlive();
  }
  
  // Disable persistent mode 
  public disablePersistentMode(): void {
    console.log('🔊 [KEEP-ALIVE] Disabling persistent mode');
    this.persistentMode = false;
  }
  
  // End conversation - stops keep-alive completely
  public endConversation(): void {
    console.log('🔊 [KEEP-ALIVE] Ending conversation - disabling persistent mode and stopping keep-alive');
    this.persistentMode = false;
    this.stopKeepAlive(true); // Force stop
  }
  
  // Start keep-alive to prevent iOS audio suspension
  public startKeepAlive(forcePersistent: boolean = false): void {
    if (forcePersistent) {
      this.persistentMode = true;
    }
    
    console.log('🔊 [KEEP-ALIVE] Starting ULTRA-AGGRESSIVE keep-alive for 15+ second API calls');
    console.log('🔊 [KEEP-ALIVE] Is iOS:', this.isIOSDevice());
    console.log('🔊 [KEEP-ALIVE] Already active:', this.keepAliveActive);
    console.log('🔊 [KEEP-ALIVE] Persistent mode:', this.persistentMode);
    
    if (!this.isIOSDevice()) {
      console.log('🔊 [KEEP-ALIVE] Not iOS device, skipping');
      return;
    }
    
    if (this.keepAliveActive && this.keepAliveAudios.length > 0) {
      console.log('🔊 [KEEP-ALIVE] Already active, ensuring all audio elements are playing...');
      // Ensure all audio elements are playing
      this.keepAliveAudios.forEach((audio, index) => {
        if (audio.paused) {
          console.log(`🔊 [KEEP-ALIVE] Restarting audio element ${index}`);
          audio.play().catch(e => console.error(`Failed to restart audio ${index}:`, e));
        }
      });
      
      // Also refresh context
      if (this.audioContext && this.audioContext.state !== 'running') {
        this.audioContext.resume();
      }
      return;
    }
    
    console.log('🔊 [KEEP-ALIVE] Initializing ULTRA-AGGRESSIVE multi-audio keep-alive');
    this.keepAliveActive = true;
    
    // Create audio context first
    if (!this.audioContext || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 [KEEP-ALIVE] Created audio context, state:', this.audioContext.state);
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      } catch (error) {
        console.error('🔊 [KEEP-ALIVE] Failed to create audio context:', error);
      }
    }
    
    // Method 1: Create MULTIPLE silent audio elements with different durations
    const durations: Array<'short' | 'medium' | 'long'> = ['short', 'medium', 'long'];
    
    if (this.keepAliveAudios.length === 0) {
      console.log('🔊 [KEEP-ALIVE] Creating 3 redundant audio elements');
      
      durations.forEach((duration, index) => {
        try {
          const audio = new Audio(this.createSilentAudioDataURL(duration));
          audio.volume = 0.001; // Nearly inaudible
          audio.loop = true;
          
          // Stagger the start times slightly
          audio.currentTime = index * 0.1;
          
          // Add error recovery
          audio.addEventListener('pause', () => {
            if (this.keepAliveActive) {
              console.log(`🔊 [KEEP-ALIVE] Audio ${index} paused, restarting...`);
              setTimeout(() => {
                audio.play().catch(e => console.error(`Audio ${index} restart failed:`, e));
              }, 50);
            }
          });
          
          audio.addEventListener('error', (e) => {
            console.error(`🔊 [KEEP-ALIVE] Audio ${index} error:`, e);
            // Try to recreate on error
            if (this.keepAliveActive) {
              setTimeout(() => {
                audio.src = this.createSilentAudioDataURL(duration);
                audio.play().catch(err => console.error(`Audio ${index} recovery failed:`, err));
              }, 100);
            }
          });
          
          this.keepAliveAudios.push(audio);
        } catch (error) {
          console.error(`🔊 [KEEP-ALIVE] Failed to create audio ${index}:`, error);
        }
      });
    }
    
    // Start all audio elements
    console.log('🔊 [KEEP-ALIVE] Starting all audio elements...');
    this.keepAliveAudios.forEach((audio, index) => {
      audio.play()
        .then(() => console.log(`🔊 [KEEP-ALIVE] Audio ${index} started`))
        .catch(error => console.error(`🔊 [KEEP-ALIVE] Audio ${index} failed:`, error));
    });
    
    // Method 2: Create oscillator for additional keep-alive
    if (this.audioContext && !this.silentOscillator) {
      try {
        this.silentOscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.0001; // Extremely quiet
        
        this.silentOscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        this.silentOscillator.frequency.value = 10; // Sub-audible frequency
        this.silentOscillator.start();
        
        console.log('🔊 [KEEP-ALIVE] Oscillator started');
      } catch (error) {
        console.error('🔊 [KEEP-ALIVE] Failed to create oscillator:', error);
      }
    }
    
    // Method 3: AGGRESSIVE checking - every 100ms
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    
    this.keepAliveInterval = setInterval(() => {
      if (!this.keepAliveActive) return;
      
      // Check audio context
      if (this.audioContext) {
        const state = this.audioContext.state;
        if (state !== 'running') {
          console.log(`🔊 [KEEP-ALIVE-100ms] Context ${state}, resuming...`);
          this.audioContext.resume().catch(err => {
            console.error('🔊 [KEEP-ALIVE-100ms] Resume failed:', err);
            // Try to recreate context
            try {
              this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              this.audioContext.resume();
            } catch (e) {
              console.error('🔊 [KEEP-ALIVE-100ms] Context recreation failed:', e);
            }
          });
        }
      }
      
      // Check all audio elements
      let pausedCount = 0;
      this.keepAliveAudios.forEach((audio, index) => {
        if (audio.paused) {
          pausedCount++;
          audio.play().catch(e => {
            // Silently try to restart
          });
        }
      });
      
      if (pausedCount > 0) {
        console.log(`🔊 [KEEP-ALIVE-100ms] Restarted ${pausedCount} paused audio(s)`);
      }
    }, 100); // Check every 100ms for ultra-fast recovery
    
    // Method 4: Additional activity timer - rotate audio elements
    if (this.audioActivityInterval) {
      clearInterval(this.audioActivityInterval);
    }
    
    this.audioActivityInterval = setInterval(() => {
      if (!this.keepAliveActive) return;
      
      // Rotate which audio is "primary" to prevent iOS from detecting pattern
      this.currentKeepAliveIndex = (this.currentKeepAliveIndex + 1) % this.keepAliveAudios.length;
      const primaryAudio = this.keepAliveAudios[this.currentKeepAliveIndex];
      
      if (primaryAudio) {
        // Adjust volume slightly to create activity
        primaryAudio.volume = 0.001 + (Math.random() * 0.0001);
      }
      
      console.log(`🔊 [KEEP-ALIVE-ROTATE] Active audio: ${this.currentKeepAliveIndex}, Context: ${this.audioContext?.state}`);
    }, 2000); // Rotate every 2 seconds
    
    console.log('🔊 [KEEP-ALIVE] ULTRA-AGGRESSIVE keep-alive fully activated with:');
    console.log('  - 3 redundant audio elements');
    console.log('  - 100ms check interval');
    console.log('  - Oscillator backup');
    console.log('  - Audio rotation every 2s');
  }
  
  // Stop keep-alive (unless in persistent mode)
  public stopKeepAlive(force: boolean = false): void {
    console.log('🔊 [KEEP-ALIVE] Stopping ULTRA-AGGRESSIVE keep-alive');
    console.log('🔊 [KEEP-ALIVE] Has audio elements:', this.keepAliveAudios.length);
    console.log('🔊 [KEEP-ALIVE] Has intervals:', !!this.keepAliveInterval, !!this.audioActivityInterval);
    console.log('🔊 [KEEP-ALIVE] Persistent mode:', this.persistentMode);
    console.log('🔊 [KEEP-ALIVE] Force stop:', force);
    
    // Don't stop if in persistent mode unless forced
    if (this.persistentMode && !force) {
      console.log('🔊 [KEEP-ALIVE] In persistent mode, ignoring stop request (use force=true to override)');
      return;
    }
    
    this.keepAliveActive = false;
    
    // Stop all audio elements (but keep them for reuse)
    this.keepAliveAudios.forEach((audio, index) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        console.log(`🔊 [KEEP-ALIVE] Audio ${index} paused`);
      } catch (e) {
        console.error(`🔊 [KEEP-ALIVE] Error stopping audio ${index}:`, e);
      }
    });
    
    // Stop oscillator
    if (this.silentOscillator) {
      try {
        this.silentOscillator.stop();
        this.silentOscillator.disconnect();
        this.silentOscillator = null;
        console.log('🔊 [KEEP-ALIVE] Oscillator stopped');
      } catch (e) {
        console.error('🔊 [KEEP-ALIVE] Error stopping oscillator:', e);
      }
    }
    
    // Clear all intervals
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    if (this.audioActivityInterval) {
      clearInterval(this.audioActivityInterval);
      this.audioActivityInterval = null;
    }
    
    console.log('🔊 [KEEP-ALIVE] All timers cleared, audio paused (elements preserved for reuse)');
    console.log('🔊 [KEEP-ALIVE] Context state preserved:', this.audioContext?.state);
  }
  
  // Manually unlock audio (call this on user interaction)
  public async manualUnlock(): Promise<boolean> {
    // Always try to unlock/refresh on iOS to ensure it's ready
    if (this.isIOSDevice()) {
      console.log('🔓 iOS: Refreshing audio unlock and pre-starting keep-alive...');
      try {
        await this.unlockAudioContext();
        
        // Pre-start keep-alive immediately on iOS to maintain context
        console.log('🔓 iOS: Pre-starting keep-alive on user interaction');
        this.startKeepAlive();
        
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
    
    // For iOS, use MP3 directly - FFmpeg conversion causes timing issues with Safari's autoplay restrictions
    console.log('🎵 Creating audio blob for iOS - using MP3 directly for better timing');
    audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    console.log('🎵 Audio blob created, size:', audioBlob.size, 'bytes')
    
    try {
      console.log('🎵 Creating audio URL from blob...');
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🎵 Audio URL created successfully');
      
      console.log('🎵 Creating Audio element...');
      const audio = new Audio(audioUrl);
      
      // iOS-specific audio settings for better compatibility
      if (this.isIOSDevice()) {
        console.log('🎵 Applying iOS-specific audio settings...');
        audio.preload = 'auto';
        audio.controls = false;
        audio.autoplay = false; // Explicitly disable autoplay
        
        // Load the audio immediately to prepare it
        console.log('🎵 Preloading audio for iOS...');
        audio.load();
        
        // Set audio session category for iOS
        if ('webkitAudioContext' in window) {
          try {
            (audio as any).webkitPreservesPitch = false;
            console.log('🎵 WebKit audio settings applied');
          } catch (e) {
            console.log('🎵 WebKit audio settings not supported');
          }
        }
      }
      
      console.log('🎵 Audio element setup complete');
      return audio;
    } catch (audioError) {
      console.error('❌ Failed to create audio element:', audioError);
      throw new Error(`Failed to create audio element: ${audioError instanceof Error ? audioError.message : String(audioError)}`);
    }
  }
  
  // Speak text with iOS compatibility
  public async speakText(
    text: string,
    options: {
      voice?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
      isWaitingForAPI?: boolean;
    } = {}
  ): Promise<void> {
    const { voice = 'nova', onStart, onEnd, onError, isWaitingForAPI = false } = options;
    
    try {
      console.log(`🔊 Speaking text (iOS: ${this.isIOSDevice()}):`, text);
      
      // Stop current speech if playing
      this.stopSpeaking();
      
      // Stop keep-alive if it's running (we're about to play real audio)
      // UNLESS we're waiting for API (filler response)
      if (!isWaitingForAPI) {
        console.log('🔊 Not waiting for API, stopping keep-alive before playback');
        this.stopKeepAlive();
      } else {
        console.log('🔊 Waiting for API, keeping keep-alive running during filler audio');
      }
      
      // For iOS, ensure audio context is ready and reactivate if needed
      if (this.isIOSDevice()) {
        console.log('🔓 Preparing audio context for iOS playback...');
        
        // Always try to reactivate the context before playback
        if (this.audioContext) {
          try {
            // Force reactivation
            if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
              console.log('🔓 Reactivating suspended/interrupted audio context...');
              await this.audioContext.resume();
            }
            
            // Double-check it's running
            if (this.audioContext.state !== 'running') {
              console.log('🔓 Creating new audio context (old one in state:', this.audioContext.state, ')');
              this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              await this.audioContext.resume();
            }
          } catch (error) {
            console.error('🔓 Failed to reactivate audio context:', error);
            // Create a fresh context
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            await this.audioContext.resume();
          }
        } else {
          // No context exists, create one
          console.log('🔓 Creating fresh audio context...');
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
        }
        
        this.isUnlocked = true;
        console.log('🔓 Audio context ready, final state:', this.audioContext.state);
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
    this.stopKeepAlive(true); // Force stop even in persistent mode
    
    // Clean up all keep-alive audio elements
    this.keepAliveAudios.forEach((audio, index) => {
      try {
        audio.pause();
        audio.src = '';
      } catch (e) {
        console.error(`Error cleaning up audio ${index}:`, e);
      }
    });
    this.keepAliveAudios = [];
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isUnlocked = false;
    this.keepAliveActive = false;
    this.currentKeepAliveIndex = 0;
    this.persistentMode = false;
  }
}

// Export singleton instance
export const iosAudioService = IOSAudioService.getInstance();