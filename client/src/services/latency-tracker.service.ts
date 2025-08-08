// Latency tracking service for dynamic timeout adjustment
import { LatencyMetrics } from '../types/feedback.types';

export class LatencyTrackerService {
  private metrics: LatencyMetrics[] = [];
  private maxSamples = 10; // Keep last 10 measurements for rolling average

  // Track API response time
  trackApiResponse(startTime: number, endTime: number): void {
    const responseTime = endTime - startTime;
    this.updateMetrics({ apiResponseTime: responseTime });
  }

  // Track TTS generation time
  trackTTSGeneration(startTime: number, endTime: number): void {
    const ttsTime = endTime - startTime;
    this.updateMetrics({ ttsGenerationTime: ttsTime });
  }

  // Track audio playback time
  trackAudioPlayback(startTime: number, endTime: number): void {
    const playbackTime = endTime - startTime;
    this.updateMetrics({ audioPlaybackTime: playbackTime });
  }

  // Track complete interaction (API + TTS + Audio)
  trackCompleteInteraction(
    apiTime: number,
    ttsTime: number,
    audioTime: number
  ): void {
    const totalTime = apiTime + ttsTime + audioTime;
    this.updateMetrics({
      apiResponseTime: apiTime,
      ttsGenerationTime: ttsTime,
      audioPlaybackTime: audioTime,
      averageLatency: totalTime
    });
  }

  private updateMetrics(newMetric: Partial<LatencyMetrics>): void {
    // Get current metrics or create new one
    const currentMetrics = this.getCurrentMetrics();
    
    // Update with new values
    const updatedMetrics: LatencyMetrics = {
      apiResponseTime: newMetric.apiResponseTime || currentMetrics.apiResponseTime,
      ttsGenerationTime: newMetric.ttsGenerationTime || currentMetrics.ttsGenerationTime,
      audioPlaybackTime: newMetric.audioPlaybackTime || currentMetrics.audioPlaybackTime,
      averageLatency: newMetric.averageLatency || 
        (newMetric.apiResponseTime || 0) + 
        (newMetric.ttsGenerationTime || 0) + 
        (newMetric.audioPlaybackTime || 0)
    };

    // Add to metrics array
    this.metrics.push(updatedMetrics);

    // Keep only last N samples
    if (this.metrics.length > this.maxSamples) {
      this.metrics = this.metrics.slice(-this.maxSamples);
    }

    console.log('📊 Latency metrics updated:', {
      latest: updatedMetrics,
      average: this.getAverageLatency(),
      samples: this.metrics.length
    });
  }

  // Get current average latency
  getAverageLatency(): number {
    if (this.metrics.length === 0) return 0;

    const totalLatency = this.metrics.reduce((sum, metric) => sum + metric.averageLatency, 0);
    return Math.round(totalLatency / this.metrics.length);
  }

  // Get average API response time
  getAverageApiResponseTime(): number {
    if (this.metrics.length === 0) return 0;

    const totalApiTime = this.metrics.reduce((sum, metric) => sum + metric.apiResponseTime, 0);
    return Math.round(totalApiTime / this.metrics.length);
  }

  // Get average TTS generation time
  getAverageTTSTime(): number {
    if (this.metrics.length === 0) return 0;

    const totalTTSTime = this.metrics.reduce((sum, metric) => sum + metric.ttsGenerationTime, 0);
    return Math.round(totalTTSTime / this.metrics.length);
  }

  // Get current metrics (latest or defaults)
  getCurrentMetrics(): LatencyMetrics {
    const latest = this.metrics[this.metrics.length - 1];
    return latest || {
      apiResponseTime: 0,
      ttsGenerationTime: 0,
      audioPlaybackTime: 0,
      averageLatency: 0
    };
  }

  // Calculate dynamic timeout based on latency
  calculateDynamicTimeout(
    baseTimeout: number,
    latencyBufferMultiplier: number,
    minTimeout: number,
    maxTimeout: number
  ): number {
    const averageLatency = this.getAverageLatency();
    
    // If no latency data, use base timeout
    if (averageLatency === 0) {
      return Math.max(minTimeout, Math.min(maxTimeout, baseTimeout));
    }

    // Calculate adjusted timeout: base + (latency * multiplier)
    const latencyBuffer = averageLatency * latencyBufferMultiplier;
    const adjustedTimeout = baseTimeout + latencyBuffer;

    // Apply min/max constraints
    const finalTimeout = Math.max(minTimeout, Math.min(maxTimeout, adjustedTimeout));

    console.log('⏱️ Dynamic timeout calculated:', {
      baseTimeout,
      averageLatency,
      latencyBuffer,
      adjustedTimeout,
      finalTimeout
    });

    return Math.round(finalTimeout);
  }

  // Reset metrics (useful for new sessions)
  reset(): void {
    this.metrics = [];
    console.log('🔄 Latency metrics reset');
  }

  // Get diagnostic info
  getDiagnostics(): {
    sampleCount: number;
    averageLatency: number;
    averageApiTime: number;
    averageTTSTime: number;
    recentMetrics: LatencyMetrics[];
  } {
    return {
      sampleCount: this.metrics.length,
      averageLatency: this.getAverageLatency(),
      averageApiTime: this.getAverageApiResponseTime(),
      averageTTSTime: this.getAverageTTSTime(),
      recentMetrics: this.metrics.slice(-3) // Last 3 samples
    };
  }
}

// Export singleton instance
export const latencyTracker = new LatencyTrackerService();