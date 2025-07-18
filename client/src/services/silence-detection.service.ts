// Silence detection service for triggering feedback flow

export interface SilenceDetectorConfig {
  threshold: number; // Silence threshold in milliseconds
  onSilenceDetected: () => void;
  onActivityDetected?: () => void;
}

export class SilenceDetectionService {
  private timer: NodeJS.Timeout | null = null;
  private config: SilenceDetectorConfig;
  private isActive: boolean = false;
  private lastActivityTime: number = Date.now();

  constructor(config: SilenceDetectorConfig) {
    this.config = config;
  }

  // Start monitoring for silence
  start() {
    if (this.isActive) {
      console.log('🔇 Silence detector already active');
      return;
    }

    console.log(`🔇 Starting silence detection (${this.config.threshold}ms threshold)`);
    this.isActive = true;
    this.lastActivityTime = Date.now();
    this.resetTimer();
  }

  // Stop monitoring
  stop() {
    if (!this.isActive) return;

    console.log('🔇 Stopping silence detection');
    this.isActive = false;
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // Reset the silence timer (called when activity is detected)
  recordActivity() {
    if (!this.isActive) return;

    this.lastActivityTime = Date.now();
    
    if (this.config.onActivityDetected) {
      this.config.onActivityDetected();
    }

    this.resetTimer();
  }

  // Update the threshold dynamically
  updateThreshold(newThreshold: number) {
    console.log(`🔇 Updating silence threshold: ${this.config.threshold}ms -> ${newThreshold}ms`);
    this.config.threshold = newThreshold;
    
    if (this.isActive) {
      this.resetTimer();
    }
  }

  // Get time since last activity
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  // Check if currently in silence period
  isInSilence(): boolean {
    return this.getTimeSinceLastActivity() >= this.config.threshold;
  }

  private resetTimer() {
    // Clear existing timer
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // Set new timer
    this.timer = setTimeout(() => {
      if (this.isActive) {
        console.log(`🔇 Silence detected after ${this.config.threshold}ms`);
        this.config.onSilenceDetected();
      }
    }, this.config.threshold);
  }

  // Clean up
  destroy() {
    this.stop();
  }
}

// Factory function for creating silence detectors with different configs
export function createSilenceDetector(
  threshold: number,
  onSilenceDetected: () => void,
  onActivityDetected?: () => void
): SilenceDetectionService {
  return new SilenceDetectionService({
    threshold,
    onSilenceDetected,
    onActivityDetected
  });
}