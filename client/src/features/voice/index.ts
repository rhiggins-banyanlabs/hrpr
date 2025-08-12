// Components
export { default as VoiceOrb } from './components/VoiceOrb';
export { default as VoiceSelector } from './components/VoiceSelector';
// Use VoiceInputWhisper as the default VoiceInput for iOS compatibility
export { default as VoiceInput } from './components/VoiceInputWhisper';
export { default as VoiceInputWebSpeech } from './components/VoiceInput';

// Hooks
export { useVoiceInput } from './hooks/useVoiceInput';
export { useSpeechRecognition } from './hooks/useSpeechRecognition';

// Services
export { default as voiceService } from './services/voiceService';

// Types
export * from './types/voice.types';