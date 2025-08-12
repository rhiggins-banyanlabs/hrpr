// Audio conversion service using FFmpeg.js for iOS compatibility
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export class AudioConverterService {
  private static instance: AudioConverterService | null = null;
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  // Singleton pattern
  public static getInstance(): AudioConverterService {
    if (!AudioConverterService.instance) {
      AudioConverterService.instance = new AudioConverterService();
    }
    return AudioConverterService.instance;
  }

  private constructor() {
    // Only initialize FFmpeg in browser environment
    if (typeof window !== 'undefined') {
      this.ffmpeg = new FFmpeg();
    }
  }

  // Initialize FFmpeg
  private async initialize(): Promise<void> {
    if (this.isLoaded || this.isLoading) return;
    if (!this.ffmpeg || typeof window === 'undefined') {
      throw new Error('FFmpeg not available (browser environment required)');
    }

    try {
      this.isLoading = true;
      console.log('🎵 Initializing FFmpeg for audio conversion...');

      // Load FFmpeg with CDN URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
      console.log('✅ FFmpeg loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load FFmpeg:', error);
      throw new Error('Failed to initialize audio converter');
    } finally {
      this.isLoading = false;
    }
  }

  // Convert audio blob to m4a format for iOS compatibility
  public async convertToM4A(audioBlob: Blob, inputFormat: string = 'webm'): Promise<Blob> {
    if (!this.ffmpeg || typeof window === 'undefined') {
      throw new Error('FFmpeg not available (browser environment required)');
    }

    try {
      // Initialize FFmpeg if not already loaded
      await this.initialize();

      console.log('🎵 Converting audio to m4a format for iOS...');
      
      // Write input file to FFmpeg virtual filesystem
      const inputFileName = `input.${inputFormat}`;
      const outputFileName = 'output.m4a';
      
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(audioBlob));

      // Convert to m4a with AAC codec (iOS compatible)
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-c:a', 'aac',           // Use AAC codec
        '-b:a', '128k',          // Set bitrate
        '-ar', '44100',          // Set sample rate
        '-ac', '1',              // Mono audio
        '-movflags', '+faststart', // Optimize for streaming
        outputFileName
      ]);

      // Read the converted file
      const data = await this.ffmpeg.readFile(outputFileName);
      
      // Clean up virtual filesystem
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      // Create blob from converted data
      // FFmpeg returns Uint8Array, convert to ArrayBuffer for Blob
      const convertedBlob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'audio/mp4' });
      
      console.log('✅ Audio converted to m4a successfully');
      return convertedBlob;
    } catch (error) {
      console.error('❌ Audio conversion failed:', error);
      throw new Error(`Failed to convert audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Convert audio blob to optimal format based on device
  public async convertForDevice(audioBlob: Blob, deviceType: 'ios' | 'other' = 'other'): Promise<Blob> {
    if (deviceType === 'ios') {
      // iOS needs m4a/AAC format
      return this.convertToM4A(audioBlob, 'webm');
    } else {
      // Other devices can use the original format
      return audioBlob;
    }
  }

  // Check if FFmpeg is loaded and ready
  public isReady(): boolean {
    return this.isLoaded && typeof window !== 'undefined';
  }

  // Preload FFmpeg for faster first conversion
  public async preload(): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('⚠️ FFmpeg preload skipped (not in browser environment)');
      return;
    }
    
    try {
      await this.initialize();
    } catch (error) {
      console.warn('⚠️ FFmpeg preload failed (will try again on first use):', error);
    }
  }
}

// Export singleton instance (lazy-loaded for browser environment)
let audioConverterInstance: AudioConverterService | null = null;

export const audioConverter = {
  getInstance(): AudioConverterService {
    if (!audioConverterInstance) {
      audioConverterInstance = AudioConverterService.getInstance();
    }
    return audioConverterInstance;
  },
  
  // Forward common methods for convenience
  async convertToM4A(audioBlob: Blob, inputFormat?: string): Promise<Blob> {
    return this.getInstance().convertToM4A(audioBlob, inputFormat);
  },
  
  async convertForDevice(audioBlob: Blob, deviceType?: 'ios' | 'other'): Promise<Blob> {
    return this.getInstance().convertForDevice(audioBlob, deviceType);
  },
  
  isReady(): boolean {
    return this.getInstance().isReady();
  },
  
  async preload(): Promise<void> {
    return this.getInstance().preload();
  }
};