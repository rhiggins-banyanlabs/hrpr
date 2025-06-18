import { Strategy } from '@/types/ai-router.types';

export class ValidationUtils {
  static validatePrompt(prompt: unknown): string | null {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return 'Invalid prompt provided';
    }
    return null;
  }

  static validateStrategy(strategy: unknown): string | null {
    if (!strategy) return null; // Will use default
    
    if (!['cheap', 'quality', 'balanced'].includes(strategy as string)) {
      return 'Invalid strategy. Must be one of: cheap, quality, balanced';
    }
    return null;
  }

  static isValidStrategy(strategy: string): strategy is Strategy {
    return ['cheap', 'quality', 'balanced'].includes(strategy);
  }
}
