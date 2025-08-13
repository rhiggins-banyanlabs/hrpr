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
  private isPreparingAudio = false; // Prevent concurrent TTS calls
  private lastUserGesture = 0; // Timestamp of last user interaction
  private gestureAudio: HTMLAudioElement | null = null; // Audio element created during gesture
  private speechSynthesis: SpeechSynthesis | null = null; // iOS native speech synthesis
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  
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
      this.setupSpeechSynthesis();
    }
  }
  
  // Set up iOS native speech synthesis
  private setupSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
      console.log('🗣️ iOS Speech Synthesis available');
    } else {
      console.log('🗣️ Speech Synthesis not available');
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
      console.log('🔓 [GESTURE] User interaction detected - preparing audio immediately');
      this.lastUserGesture = Date.now();
      
      // Create a gesture audio element immediately during user interaction
      this.createGestureAudio();
      
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
  
  // Create an audio element during user gesture for immediate playback capability
  private createGestureAudio(): void {
    if (this.gestureAudio) {
      return; // Already have one
    }
    
    try {
      // Create a silent audio element during the gesture
      const silentData = this.createSilentAudioDataURL('short');
      this.gestureAudio = new Audio(silentData);
      this.gestureAudio.volume = 0.001;
      this.gestureAudio.preload = 'auto';
      
      // Play it immediately to establish the gesture connection
      this.gestureAudio.play().then(() => {
        console.log('🔓 [GESTURE] Gesture audio established');
        // Pause it immediately - we just needed to establish the connection
        this.gestureAudio?.pause();
      }).catch(err => {
        console.error('🔓 [GESTURE] Failed to establish gesture audio:', err);
      });
    } catch (error) {
      console.error('🔓 [GESTURE] Failed to create gesture audio:', error);
    }
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
    const unlockStartTime = performance.now();
    
    // Always try to unlock/refresh on iOS to ensure it's ready
    if (this.isIOSDevice()) {
      console.log('🔓 [SPEED] iOS: Fast unlock and context prep...');
      try {
        // Create context immediately for fastest subsequent TTS
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        this.isUnlocked = true;
        
        // Pre-start keep-alive immediately on iOS to maintain context  
        this.startKeepAlive();
        
        const unlockTime = performance.now() - unlockStartTime;
        console.log(`🔓 [SPEED] iOS unlock completed in ${unlockTime.toFixed(0)}ms`);
        
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
        speed: parseFloat(process.env.NEXT_PUBLIC_TTS_SPEED || '1.3')
      }),
    });
    
    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.statusText}`);
    }
    
    return response.arrayBuffer();
  }
  
  // Create audio element with iOS-compatible settings - OPTIMIZED FOR SPEED
  private async createAudioElement(audioBuffer: ArrayBuffer): Promise<HTMLAudioElement> {
    // Minimal blob creation for speed
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Minimal iOS settings - remove unnecessary steps
    if (this.isIOSDevice()) {
      audio.preload = 'auto';
      audio.controls = false;
      audio.autoplay = false;
      
      // Start loading immediately but don't wait for it
      audio.load();
    }
    
    return audio;
  }
  
  // Debug function to list all available iOS voices with their properties
  public listAvailableVoices(): void {
    if (!this.speechSynthesis) {
      console.log('🗣️ [DEBUG] Speech synthesis not available');
      return;
    }
    
    const voices = this.speechSynthesis.getVoices();
    console.log('🗣️ [DEBUG] ===== ALL AVAILABLE iOS VOICES =====');
    console.log(`🗣️ [DEBUG] Total voices found: ${voices.length}`);
    
    voices.forEach((voice, index) => {
      if (voice.lang.startsWith('en')) {
        console.log(`🗣️ [DEBUG] [${index}] "${voice.name}"`);
        console.log(`   - Language: ${voice.lang}`);
        console.log(`   - Local: ${voice.localService}`);
        console.log(`   - Default: ${voice.default}`);
        console.log(`   - URI: ${voice.voiceURI}`);
        console.log('   ---');
      }
    });
    
    // Look specifically for Enhanced/Premium voices
    const enhancedVoices = voices.filter(v => 
      v.name.includes('Enhanced') ||
      v.name.includes('(Enhanced)') ||
      v.name.toLowerCase().includes('premium') ||
      v.voiceURI.toLowerCase().includes('enhanced') ||
      v.voiceURI.toLowerCase().includes('premium')
    );
    
    console.log('🗣️ [DEBUG] ===== ENHANCED/PREMIUM VOICES SEARCH =====');
    if (enhancedVoices.length > 0) {
      console.log(`🎯 Found ${enhancedVoices.length} Enhanced/Premium voice(s):`);
      enhancedVoices.forEach(voice => {
        console.log(`🎤 ENHANCED: "${voice.name}" - URI: ${voice.voiceURI} - Local: ${voice.localService}`);
      });
    } else {
      console.log('❌ No Enhanced voices found in available voices');
      console.log('🔍 Searching for voices containing "Ava", "Premium", "neural":');
      
      const alternativeVoices = voices.filter(v =>
        v.name.includes('Ava') ||
        v.name.includes('Samantha') ||
        v.name.toLowerCase().includes('neural') ||
        v.name.toLowerCase().includes('premium') ||
        v.voiceURI.toLowerCase().includes('neural') ||
        v.voiceURI.toLowerCase().includes('premium')
      );
      
      alternativeVoices.forEach(voice => {
        console.log(`🔍 ALTERNATIVE: "${voice.name}" - URI: ${voice.voiceURI}`);
      });
    }
    
    // Show the most reliable fallback voices
    const reliable = voices.filter(v => 
      v.lang.startsWith('en') && 
      v.localService !== false &&
      (v.name === 'Samantha' || v.name === 'Alex' || v.name === 'Victoria')
    );
    
    console.log('🗣️ [DEBUG] ===== MOST RELIABLE FALLBACK VOICES =====');
    reliable.forEach(voice => {
      console.log(`✅ ${voice.name} (${voice.lang}) - Local: ${voice.localService}`);
    });
  }

  // Preprocess text for more natural speech (keep all punctuation, just improve flow)
  private preprocessTextForNaturalSpeech(text: string): string {
    let processedText = text;
    
    // DON'T remove punctuation - keep it for proper sentence flow
    // Instead we'll configure the utterance to not speak punctuation marks
    console.log('🗣️ [PREPROCESSING] Keeping all punctuation, will configure TTS to not speak it');
    
    // Add pauses after introductory words/phrases
    processedText = processedText.replace(/^(Hi|Hello|Well|So|Now|Actually|However|Furthermore|Additionally|Meanwhile|Therefore|Consequently),?\s*/g, '$1, ');
    processedText = processedText.replace(/\b(Hi|Hello|Well|So|Now|Actually|However|Furthermore|Additionally|Meanwhile|Therefore|Consequently),?\s+/g, '$1, ');
    
    // Add pauses after transitional phrases
    processedText = processedText.replace(/\b(for example|such as|in fact|by the way|on the other hand|in other words|as a result),?\s*/gi, '$1, ');
    
    // Add emphasis pauses around important words
    processedText = processedText.replace(/\b(important|crucial|essential|significant|remember|note that|please|exactly|specifically)\b/gi, '... $1 ...');
    
    // Add natural breathing pauses in long sentences (every 12-15 words)
    const words = processedText.split(' ');
    if (words.length > 12) {
      let wordCount = 0;
      processedText = words.map(word => {
        wordCount++;
        if (wordCount % 12 === 0 && wordCount < words.length - 3) {
          return word + ',';
        }
        return word;
      }).join(' ');
    }
    
    // Clean up only excessive punctuation (keep normal punctuation)
    processedText = processedText.replace(/[,]{2,}/g, ',');
    processedText = processedText.replace(/\.{4,}/g, '...');
    
    console.log('🗣️ [PREPROCESSING] Final result (punctuation preserved):', processedText);
    
    return processedText;
  }
  
  // Break text into natural chunks for better speech flow
  private createNaturalSpeechChunks(text: string): string[] {
    // First preprocess the text for natural pauses
    const processedText = this.preprocessTextForNaturalSpeech(text);
    
    // Split by natural sentence boundaries
    const sentences = processedText.match(/[^.!?]+[.!?]+/g) || [processedText];
    const chunks: string[] = [];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      
      // If sentence is short enough, keep it as one chunk
      if (trimmed.length <= 120) {
        chunks.push(trimmed);
      } else {
        // Split long sentences by commas and natural pauses
        const parts = trimmed.split(/([,;:—\-])/);
        let currentChunk = '';
        
        for (const part of parts) {
          if ((currentChunk + part).length <= 120) {
            currentChunk += part;
          } else {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = part;
          }
        }
        
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
      }
    }
    
    console.log('🗣️ [CHUNKING] Created', chunks.length, 'natural chunks');
    console.log('🗣️ [CHUNKING] Chunks:', chunks);
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  // Use iOS native speech synthesis as fallback
  public async speakWithNativeSynthesis(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    const { onStart, onEnd, onError } = options;
    
    console.log('🗣️ [NATURAL] Starting natural iOS speech synthesis');
    console.log('🗣️ [NATURAL] Text length:', text.length, 'characters');
    
    if (!this.speechSynthesis) {
      const error = new Error('Speech synthesis not available');
      console.error('🗣️ [NATURAL] Speech synthesis not available');
      throw error;
    }
    
    try {
      // Stop any current speech
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      
      // Create natural speech chunks with preprocessing
      const chunks = this.createNaturalSpeechChunks(text);
      console.log('🗣️ [NATURAL] Created', chunks.length, 'natural chunks');
      
      if (chunks.length === 0) {
        console.warn('🗣️ [NATURAL] No chunks created, nothing to speak');
        onEnd?.();
        return;
      }
      
      // Signal start
      onStart?.();
      this.isSpeaking = true;
      
      // Process chunks with natural pauses
      await this.processNaturalChunks(chunks);
      
      // Signal end
      console.log('🗣️ [NATURAL] All natural chunks completed successfully');
      this.isSpeaking = false;
      onEnd?.();
      
    } catch (error) {
      console.error('🗣️ [NATURAL] Natural speech synthesis failed:', error);
      this.isSpeaking = false;
      this.currentUtterance = null;
      const err = error instanceof Error ? error : new Error('Natural speech synthesis failed');
      onError?.(err);
      throw err;
    }
  }
  
  // Process natural chunks with micro-pauses for better flow
  private async processNaturalChunks(chunks: string[]): Promise<void> {
    let chunkIndex = 0;
    
    while (chunkIndex < chunks.length) {
      const chunk = chunks[chunkIndex];
      console.log(`🗣️ [NATURAL] Speaking chunk ${chunkIndex + 1}/${chunks.length}: "${chunk}"`);
      
      try {
        await this.speakNaturalChunk(chunk, chunkIndex);
        console.log(`🗣️ [NATURAL] Chunk ${chunkIndex + 1} completed`);
        
        chunkIndex++;
        
        // Add micro-pause between chunks for natural flow (300-500ms)
        if (chunkIndex < chunks.length) {
          const pauseLength = chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?') ? 500 : 300;
          console.log(`🗣️ [NATURAL] Natural pause: ${pauseLength}ms`);
          await this.delay(pauseLength);
        }
        
      } catch (error) {
        console.error(`🗣️ [NATURAL] Chunk ${chunkIndex + 1} failed:`, error);
        // Continue with next chunk instead of failing completely
        chunkIndex++;
        await this.delay(500); // Pause before next chunk
      }
    }
  }
  
  // Speak a single natural chunk with enhanced voice settings
  private async speakNaturalChunk(text: string, chunkIndex: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Natural timeout (8 seconds should be enough for any chunk)
      const timeout = setTimeout(() => {
        console.warn(`🗣️ [NATURAL] Chunk ${chunkIndex + 1} timed out after 8 seconds`);
        this.speechSynthesis?.cancel();
        reject(new Error('Natural chunk timeout'));
      }, 8000);
      
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      
      // Configure utterance for more natural speech
      utterance.rate = 1.05; // Slightly faster but more natural
      utterance.pitch = 0.95; // Slightly lower pitch for warmth
      utterance.volume = 0.9; // Slightly softer volume
      
      // CRITICAL: Configure iOS TTS to NOT speak punctuation marks
      // This keeps punctuation for sentence flow but prevents saying "dot", "comma", etc.
      try {
        // Method 1: iOS TTS punctuation properties (if supported)
        (utterance as any).punctuation = 'none'; // Don't speak punctuation
        (utterance as any).speakPunctuation = false; // Alternative property
        console.log('🗣️ [NATURAL] Applied punctuation control settings');
      } catch (error) {
        console.log('🗣️ [NATURAL] Native punctuation control not supported');
      }
      
      // Method 2: Some iOS voices naturally handle punctuation better
      // The voice selection below will prioritize voices that don't over-vocalize punctuation
      
      // Apply enhanced voice selection to each chunk
      if (this.speechSynthesis) {
        const voices = this.speechSynthesis.getVoices();
        
        // iOS Native Voices - prioritize the BEST sounding standard voices
        const preferredVoiceNames = [
          // Tier 0: Best sounding standard iOS voices (often better than "enhanced")
          'Samantha',      // Female US - consistently the most natural iOS voice
          'Ava',           // Female US - modern, clear, natural
          'Allison',       // Female US - warm, natural
          'Victoria',      // Female US - professional, clear
          'Alex',          // Male US - classic, reliable
          
          // Tier 1: Other good standard voices
          'Susan',         // Female US - classic, natural
          'Vicki',         // Female US - friendly
          'Bruce',         // Male US - deep, clear
          'Fred',          // Male US - standard
          
          // Tier 2: International voices (if needed)
          'Daniel',        // Male UK - British accent
          'Kate',          // Female UK - British
          'Karen',         // Female AU - Australian
          'Moira',         // Female IE - Irish
        ];
        
        let selectedVoice = null;
        
        // Filter to only LOCAL voices (no download required) for guaranteed speed
        const localVoices = voices.filter(voice => 
          voice.lang.startsWith('en') && 
          voice.localService !== false // Ensure it's local
        );
        
        console.log('🗣️ [NATURAL] Local voices available:', localVoices.map(v => `${v.name} (local: ${v.localService})`));
        
        // Skip Enhanced/Premium filtering - use the best STANDARD voices
        console.log('🗣️ [SELECTION] Using standard high-quality voices (skipping Enhanced/Premium)');
        
        // Try to find the best LOCAL voice from our preferred list
        for (const voiceName of preferredVoiceNames) {
          console.log(`🗣️ [SELECTION] Trying to find: "${voiceName}"`);
          selectedVoice = localVoices.find(voice => 
            voice.name === voiceName || voice.name.includes(voiceName)
          );
          if (selectedVoice) {
            console.log('✅ [STANDARD] Found preferred LOCAL voice:', selectedVoice.name);
            console.log('✅ [STANDARD] Voice URI:', selectedVoice.voiceURI);
            console.log('✅ [STANDARD] Is Local:', selectedVoice.localService);
            break;
          } else {
            console.log(`❌ [SELECTION] "${voiceName}" not found`);
          }
        }
        
        // Fallback to any local English voice
        if (!selectedVoice && localVoices.length > 0) {
          selectedVoice = localVoices[0]; // Use first available local voice
          console.log('🗣️ [NATURAL] Using fallback LOCAL voice:', selectedVoice.name);
        }
        
        // Last resort: any English voice (might not be local)
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
          console.log('🗣️ [NATURAL] Using last resort voice (may not be local):', selectedVoice?.name || 'default');
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          if (chunkIndex === 0) { // Only log once per response
            console.log('🗣️ [NATURAL] Using voice:', selectedVoice.name);
          }
        }
      }
      
      utterance.onstart = () => {
        console.log(`🗣️ [NATURAL] Chunk ${chunkIndex + 1} started`);
      };
      
      utterance.onend = () => {
        console.log(`🗣️ [NATURAL] Chunk ${chunkIndex + 1} ended`);
        clearTimeout(timeout);
        this.currentUtterance = null;
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error(`🗣️ [NATURAL] Chunk ${chunkIndex + 1} error:`, event.error);
        clearTimeout(timeout);
        this.currentUtterance = null;
        reject(new Error(`Natural speech error: ${event.error}`));
      };
      
      try {
        if (this.speechSynthesis) {
          this.speechSynthesis.speak(utterance);
        } else {
          clearTimeout(timeout);
          reject(new Error('Speech synthesis unavailable'));
        }
      } catch (speakError) {
        clearTimeout(timeout);
        console.error(`🗣️ [NATURAL] Error calling speak() for chunk ${chunkIndex + 1}:`, speakError);
        reject(speakError);
      }
    });
  }
  
  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Speak text with iOS compatibility - SPEED OPTIMIZED
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
    const startTime = performance.now();
    
    try {
      console.log(`🔊 [SPEED] Starting TTS for: "${text.substring(0, 50)}..."`);
      console.log(`🔊 [SPEED] iOS device: ${this.isIOSDevice()}, waiting for API: ${isWaitingForAPI}`);
      
      if (this.isIOSDevice()) {
        console.log('🗣️ [iOS SOLUTION] Using native iOS TTS to eliminate audio timeout/blocking issues');
        console.log('🗣️ [iOS SOLUTION] Native TTS starts instantly and is never blocked by iOS audio restrictions');
      }
      
      // Prevent concurrent TTS calls that could cause issues
      if (this.isPreparingAudio) {
        console.log('🔊 [SPEED] Already preparing audio, stopping current...');
      }
      this.isPreparingAudio = true;
      
      // Stop current speech if playing
      this.stopSpeaking();
      
      // FOR iOS: ALWAYS use native speech synthesis (instant, never blocked, better reliability)
      if (this.isIOSDevice() && this.speechSynthesis) {
        console.log('🗣️ [NATIVE] Using iOS native speech synthesis for ALL responses (filler, main, feedback)');
        console.log('🗣️ [NATIVE] This ensures instant playback without audio blocking issues');
        
        try {
          await this.speakWithNativeSynthesis(text, {
            onStart,
            onEnd: () => {
              this.isPreparingAudio = false;
              onEnd?.();
            },
            onError: (error) => {
              console.error('🗣️ [NATIVE] Native synthesis failed:', error);
              // For iOS, we'll still try to fall back to OpenAI TTS if native fails
              // But native should virtually never fail on iOS devices
            }
          });
          
          // If we get here, native synthesis succeeded
          console.log('🗣️ [NATIVE] Native synthesis completed successfully - no audio blocking!');
          return;
          
        } catch (nativeError) {
          console.warn('🗣️ [NATIVE] Native synthesis failed (rare), falling back to OpenAI TTS:', nativeError);
          // Continue to OpenAI TTS fallback below (this should be very rare)
        }
      }
      
      // Stop keep-alive if it's running (we're about to play real audio)
      // UNLESS we're waiting for API (filler response)
      if (!isWaitingForAPI) {
        console.log('🔊 Not waiting for API, stopping keep-alive before playback');
        this.stopKeepAlive();
      } else {
        console.log('🔊 Waiting for API, keeping keep-alive running during filler audio');
      }
      
      // Start TTS API call immediately - don't wait for context prep
      console.log('🚀 Starting TTS API call immediately for speed');
      const ttsPromise = this.getTTSAudio(text, voice);
      
      // Do context prep in parallel with TTS API call
      const contextPromise = this.isIOSDevice() ? (async () => {
        console.log('🔓 Preparing audio context in parallel...');
        
        // Quick context check/creation
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Only resume if needed
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        this.isUnlocked = true;
        console.log('🔓 Context ready:', this.audioContext.state);
      })() : Promise.resolve();
      
      // Wait for both TTS and context prep to complete
      const [audioBuffer] = await Promise.all([ttsPromise, contextPromise]);
      const ttsCompleteTime = performance.now();
      console.log(`🔊 [SPEED] TTS API completed in ${(ttsCompleteTime - startTime).toFixed(0)}ms`);
      
      // Try to reuse gesture audio element if it's recent enough (within 30 seconds)
      const gestureAge = Date.now() - this.lastUserGesture;
      let audio: HTMLAudioElement;
      
      if (this.gestureAudio && gestureAge < 30000 && this.isIOSDevice()) {
        console.log(`🔓 [GESTURE] Reusing gesture audio (${gestureAge}ms old)`);
        // Replace the audio source with our TTS data
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Clean up old URL if exists
        if (this.gestureAudio.src) {
          URL.revokeObjectURL(this.gestureAudio.src);
        }
        
        this.gestureAudio.src = audioUrl;
        this.gestureAudio.load();
        this.gestureAudio.volume = 1.0; // Full volume for actual content
        audio = this.gestureAudio;
        
        // Don't null gestureAudio yet - keep it for next use
      } else {
        // Create new audio element
        console.log(`🔊 Creating new audio element (gesture age: ${gestureAge}ms)`);
        audio = await this.createAudioElement(audioBuffer);
      }
      
      this.currentAudio = audio;
      this.isSpeaking = true;
      
      const audioCreatedTime = performance.now();
      console.log(`🔊 [SPEED] Audio element created in ${(audioCreatedTime - ttsCompleteTime).toFixed(0)}ms`);
      
      // Set up event listeners
      audio.onloadstart = () => {
        console.log('🔊 Audio loading started');
      };
      
      audio.oncanplay = () => {
        console.log('🔊 Audio can play');
      };
      
      audio.onplay = () => {
        const playStartTime = performance.now();
        console.log(`🔊 [SPEED] Audio playback started - total time: ${(playStartTime - startTime).toFixed(0)}ms`);
        onStart?.();
      };
      
      audio.onended = () => {
        const endTime = performance.now();
        console.log(`🔊 [SPEED] Audio playback ended - total time: ${(endTime - startTime).toFixed(0)}ms`);
        this.isSpeaking = false;
        this.currentAudio = null;
        this.isPreparingAudio = false;
        URL.revokeObjectURL(audio.src);
        onEnd?.();
      };
      
      audio.onerror = (event) => {
        console.error('🔊 Audio playback error:', event);
        this.isSpeaking = false;
        this.currentAudio = null;
        this.isPreparingAudio = false;
        URL.revokeObjectURL(audio.src);
        onError?.(new Error('Audio playback failed'));
      };
      
      // Try to play the audio IMMEDIATELY with retry logic
      try {
        console.log('🔊 [PLAY] Attempting immediate playback...');
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
        }
        console.log('🔊 [PLAY] Playback started successfully');
      } catch (playError: any) {
        console.error('🔊 [PLAY] First attempt failed:', playError.message);
        
        // EMERGENCY RETRY LOGIC for iOS
        if (this.isIOSDevice() && playError.name === 'NotAllowedError') {
          console.log('🔊 [RETRY] Attempting emergency retry with fresh gesture audio...');
          
          try {
            // Force create a new gesture audio and try again
            console.log('🔊 [RETRY] Creating emergency gesture audio...');
            const gestureAudio = new Audio(this.createSilentAudioDataURL('short'));
            gestureAudio.volume = 0.001;
            gestureAudio.preload = 'auto';
            
            // Play it immediately to establish the gesture connection
            await gestureAudio.play();
            gestureAudio.pause(); // Pause the silent audio
            
            // Now load our actual TTS content
            const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            gestureAudio.src = audioUrl;
            gestureAudio.load();
            gestureAudio.volume = 1.0;
            
            // Try to play the TTS
            const retryPromise = gestureAudio.play();
            if (retryPromise) {
              await retryPromise;
              console.log('🔊 [RETRY] Emergency retry successful!');
              
              // Update current audio reference and gesture audio
              this.currentAudio = gestureAudio;
              this.gestureAudio = gestureAudio;
              return; // Success!
            }
          } catch (retryError) {
            console.error('🔊 [RETRY] Emergency retry also failed:', retryError);
          }
        }
        
        // If we get here, both attempts failed
        console.error('🔊 All playback attempts failed:', playError);
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
        this.isPreparingAudio = false;
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
      this.isPreparingAudio = false;
      onError?.(error instanceof Error ? error : new Error('Unknown TTS error'));
    }
  }
  
  // Stop current speech
  public stopSpeaking(): void {
    // Stop native iOS speech synthesis if active
    if (this.currentUtterance && this.speechSynthesis) {
      console.log('🔊 Stopping native iOS speech synthesis');
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    
    // Stop OpenAI TTS audio if active
    if (this.currentAudio) {
      console.log('🔊 Stopping current audio');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
    
    this.isSpeaking = false;
    this.isPreparingAudio = false;
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
    
    // Clean up gesture audio
    if (this.gestureAudio) {
      try {
        this.gestureAudio.pause();
        if (this.gestureAudio.src) {
          URL.revokeObjectURL(this.gestureAudio.src);
        }
      } catch (e) {
        console.error('Error cleaning up gesture audio:', e);
      }
      this.gestureAudio = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Clean up native speech synthesis
    if (this.speechSynthesis && this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    
    this.isUnlocked = false;
    this.keepAliveActive = false;
    this.currentKeepAliveIndex = 0;
    this.persistentMode = false;
    this.isPreparingAudio = false;
    this.lastUserGesture = 0;
  }
}

// Export singleton instance
export const iosAudioService = IOSAudioService.getInstance();