// Components
export { default as VoiceOrb } from './components/VoiceOrb';
export { default as VoiceSelector } from './components/VoiceSelector';
// Use Smart VoiceInput that auto-detects best method for device/browser
export { default as VoiceInput } from './components/VoiceInputSmart';
export { default as VoiceInputWebSpeech } from './components/VoiceInput';
export { default as VoiceInputWhisper } from './components/VoiceInputWhisper';

// Hooks
export { useVoiceInput } from './hooks/useVoiceInput';
export { useSpeechRecognition } from './hooks/useSpeechRecognition';

// Services
export { default as voiceService } from './services/voiceService';

// Types
export * from './types/voice.types';