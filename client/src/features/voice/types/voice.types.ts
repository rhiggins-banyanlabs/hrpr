// src/types/voice.types.ts

export type OpenAIVoice = 
  | 'alloy'
  | 'echo' 
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer';

export interface VoiceConfig {
  id: OpenAIVoice;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  tone: string;
}

export const OPENAI_VOICES: Record<OpenAIVoice, VoiceConfig> = {
  alloy: {
    id: 'alloy',
    name: 'Alloy',
    description: 'Neutral, balanced voice',
    gender: 'neutral',
    tone: 'balanced'
  },
  echo: {
    id: 'echo',
    name: 'Echo',
    description: 'Male voice with clarity',
    gender: 'male',
    tone: 'clear'
  },
  fable: {
    id: 'fable',
    name: 'Fable',
    description: 'Warm, storytelling voice',
    gender: 'female',
    tone: 'warm'
  },
  onyx: {
    id: 'onyx',
    name: 'Onyx',
    description: 'Deep, authoritative male voice',
    gender: 'male',
    tone: 'authoritative'
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    description: 'Energetic, youthful female voice',
    gender: 'female',
    tone: 'energetic'
  },
  shimmer: {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Gentle, professional female voice',
    gender: 'female',
    tone: 'professional'
  }
};

export interface TTSRequest {
  text: string;
  voice: OpenAIVoice;
  model?: 'tts-1' | 'tts-1-hd';
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number; // 0.25 to 4.0
}

export interface STTRequest {
  audio: File | Blob;
  model?: 'whisper-1';
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number; // 0 to 1
}

export interface STTResponse {
  text: string;
}

export interface TTSResponse {
  audio: ArrayBuffer;
}

// Voice selector component props
export interface VoiceSelectorProps {
  selectedVoice: OpenAIVoice;
  onVoiceChange: (voice: OpenAIVoice) => void;
  className?: string;
}