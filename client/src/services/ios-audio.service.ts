// iOS-compatible audio service that handles autoplay restrictions
import { chunkedOpenAITTS } from './chunked-openai-tts.service';

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
  private wakeLock: any = null; // Screen Wake Lock API for iOS
  
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
  
  // DISABLED: Set up iOS native speech synthesis (using OpenAI TTS exclusively)
  private setupSpeechSynthesis(): void {
    console.log('🗣️ [DISABLED] Native speech synthesis disabled - using OpenAI TTS exclusively');
    this.speechSynthesis = null; // Force null to prevent any native synthesis calls
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

  // Refresh existing keep-alive
  private refreshKeepAlive(): void {
    console.log('🔊 [REFRESH] Refreshing keep-alive system...');
    
    // Ensure audio context is running
    if (this.audioContext && this.audioContext.state !== 'running') {
      console.log('🔊 [REFRESH] Resuming suspended audio context');
      this.audioContext.resume().catch(e => console.error('Context resume failed:', e));
    }
    
    // Restart any paused audio elements
    this.keepAliveAudios.forEach((audio, index) => {
      if (audio.paused) {
        console.log(`🔊 [REFRESH] Restarting paused audio element ${index}`);
        audio.play().catch(e => console.error(`Audio restart failed:`, e));
      }
    });
    
    // Restart oscillator if needed
    if (!this.silentOscillator && this.audioContext) {
      this.createSilentOscillator();
    }
  }

  // Create a simple silent oscillator for keep-alive
  private createSilentOscillator(): void {
    if (!this.audioContext) return;
    
    try {
      this.silentOscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      this.silentOscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Ultra-quiet but still active
      gainNode.gain.setValueAtTime(0.001, this.audioContext.currentTime);
      this.silentOscillator.frequency.setValueAtTime(20000, this.audioContext.currentTime); // Above hearing range
      
      this.silentOscillator.start();
      console.log('🔊 [OSCILLATOR] Silent oscillator created and started');
    } catch (error) {
      console.error('🔊 [OSCILLATOR] Failed to create oscillator:', error);
    }
  }
  
  // Start SIMPLIFIED keep-alive to prevent iOS audio suspension  
  public startKeepAlive(forcePersistent: boolean = false): void {
    if (forcePersistent) {
      this.persistentMode = true;
    }
    
    console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Starting simplified keep-alive system');
    console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Is iOS:', this.isIOSDevice());
    console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Already active:', this.keepAliveActive);
    
    if (!this.isIOSDevice()) {
      console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Not iOS device, skipping');
      return;
    }
    
    if (this.keepAliveActive) {
      console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Already active, refreshing...');
      this.refreshKeepAlive();
      return;
    }
    
    console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Initializing SIMPLE and RELIABLE keep-alive');
    this.keepAliveActive = true;
    
    // Ensure audio context exists and is running
    if (!this.audioContext || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Created audio context, state:', this.audioContext.state);
      } catch (error) {
        console.error('🔊 [SIMPLIFIED-KEEP-ALIVE] Failed to create audio context:', error);
        return;
      }
    }
    
    // Always resume if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Create ONE simple silent audio element for keep-alive
    if (this.keepAliveAudios.length === 0) {
      console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Creating single reliable audio element');
      
      try {
        const audio = new Audio(this.createSilentAudioDataURL('medium'));
        audio.volume = 0.001; // Nearly inaudible but still active
        audio.loop = true;
        
        // Simple restart on pause
        audio.addEventListener('pause', () => {
          if (this.keepAliveActive) {
            console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Audio paused, restarting...');
            audio.play().catch(e => console.error('Audio restart failed:', e));
          }
        });
        
        // Simple error handling
        audio.addEventListener('error', (e) => {
          console.error('🔊 [SIMPLIFIED-KEEP-ALIVE] Audio error:', e);
        });
        
        this.keepAliveAudios.push(audio);
      } catch (error) {
        console.error('🔊 [SIMPLIFIED-KEEP-ALIVE] Failed to create audio:', error);
      }
    }
    
    // Start the audio element
    if (this.keepAliveAudios.length > 0) {
      console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Starting keep-alive audio...');
      this.keepAliveAudios[0].play()
        .then(() => console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Audio started successfully'))
        .catch(error => console.error('🔊 [SIMPLIFIED-KEEP-ALIVE] Audio failed to start:', error));
    }
    
    // Create a simple oscillator for backup keep-alive
    this.createSilentOscillator();
    
    // Simple interval check - every 1 second (less aggressive but more reliable)
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    
    this.keepAliveInterval = setInterval(() => {
      if (!this.keepAliveActive) return;
      
      // Check and resume audio context if suspended
      if (this.audioContext && this.audioContext.state !== 'running') {
        console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Context suspended, resuming...');
        this.audioContext.resume().catch(err => console.error('Context resume failed:', err));
      }
      
      // Check and restart any paused audio
      if (this.keepAliveAudios.length > 0 && this.keepAliveAudios[0].paused) {
        console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Audio paused, restarting...');
        this.keepAliveAudios[0].play().catch(e => console.error('Audio restart failed:', e));
      }
      
      console.log(`🔊 [SIMPLIFIED-KEEP-ALIVE] Status - Context: ${this.audioContext?.state}, Audio: ${this.keepAliveAudios.length > 0 ? (this.keepAliveAudios[0].paused ? 'paused' : 'playing') : 'none'}`);
    }, 1000); // Check every second
    
    console.log('🔊 [SIMPLIFIED-KEEP-ALIVE] Simple keep-alive activated with:');
    console.log('  - 1 silent audio element (looped)');
    console.log('  - 1 silent oscillator (backup)');  
    console.log('  - 1 second check interval');
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
  
  // DISABLED: Debug function to list all available iOS voices (now using OpenAI TTS exclusively)
  public listAvailableVoices(): void {
    console.log('🗣️ [DISABLED] Voice listing disabled - using OpenAI TTS voices exclusively');
    return;
  }
  
  // DISABLED: Text preprocessing for natural speech (only used by native synthesis)
  private preprocessTextForSynthesis(text: string): string {
    console.log('🗣️ [DISABLED] Text preprocessing disabled - using OpenAI TTS exclusively');
    return text; // Return text as-is since we're using OpenAI TTS
  }

  // DISABLED: Preprocess text for more natural speech (only used by native synthesis)
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

  // DISABLED: Use iOS native speech synthesis as fallback (now using OpenAI TTS exclusively)
  public async speakWithNativeSynthesis(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    const { onStart, onEnd, onError } = options;
    
    console.log('🗣️ [DISABLED] Native iOS speech synthesis disabled - using OpenAI TTS exclusively');
    
    // Immediately throw error to force fallback to OpenAI TTS
    const error = new Error('Native synthesis disabled - using OpenAI TTS');
    onError?.(error);
    throw error;
  }
  
  // DISABLED: Process natural chunks with micro-pauses for better flow (only used by native synthesis)
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
  
  // DISABLED: Speak a single natural chunk with enhanced voice settings (only used by native synthesis)
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
  
  // iOS Wake Lock to prevent audio blocking
  public async requestWakeLock(): Promise<boolean> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('🔒 iOS wake lock acquired successfully');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('🔒 iOS wake lock released');
        });
        
        return true;
      } else {
        console.log('🔒 Wake Lock API not supported on this device');
        return false;
      }
    } catch (error) {
      console.error('🔒 Failed to acquire wake lock:', error);
      return false;
    }
  }
  
  // Release wake lock
  public releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('🔒 Wake lock manually released');
    }
  }
  
  // Check if wake lock is active
  public isWakeLockActive(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }
  
  // Speak text with CHUNKED OpenAI TTS - iOS workaround implementation
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
      console.log(`🔊 [CHUNKED-TTS] Starting CHUNKED OpenAI TTS for: "${text.substring(0, 50)}..."`);
      console.log(`🔊 [CHUNKED-TTS] iOS device: ${this.isIOSDevice()}, text length: ${text.length}`);
      
      // Prevent concurrent TTS calls
      if (this.isPreparingAudio) {
        console.log('🔊 [CHUNKED-TTS] Already preparing audio, stopping current...');
        this.stopSpeaking();
      }
      this.isPreparingAudio = true;
      
      // Stop current speech if playing
      this.stopSpeaking();
      
      // Use the new CHUNKED OpenAI TTS approach (iOS workaround)
      console.log('🔊 [CHUNKED-TTS] Using new chunked OpenAI TTS implementation');
      
      await chunkedOpenAITTS.playText(
        text,
        voice,
        () => {
          console.log('🔊 [CHUNKED-TTS] Playback started');
          this.isSpeaking = true;
          onStart?.();
        },
        () => {
          console.log('🔊 [CHUNKED-TTS] Playback completed');
          this.isSpeaking = false;
          this.isPreparingAudio = false;
          onEnd?.();
        },
        (error) => {
          console.error('🔊 [CHUNKED-TTS] Playback failed:', error);
          this.isSpeaking = false;
          this.isPreparingAudio = false;
          onError?.(error);
        }
      );
      
      return; // Exit early - chunked TTS handles everything
      
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
    console.log('🔊 [STOP] Stopping all TTS playback');
    
    // Stop chunked TTS if active
    chunkedOpenAITTS.stopPlayback();
    
    // Stop native iOS speech synthesis if active (legacy)
    if (this.currentUtterance && this.speechSynthesis) {
      console.log('🔊 Stopping native iOS speech synthesis');
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    
    // Stop OpenAI TTS audio if active (legacy)
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