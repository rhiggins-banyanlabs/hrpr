// components/VoiceSelector.tsx
import React, { useState } from 'react';
import { OpenAIVoice, OPENAI_VOICES, VoiceSelectorProps } from '@/types/voice.types';

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testingVoice, setTestingVoice] = useState<OpenAIVoice | null>(null);

  const testVoice = async (voice: OpenAIVoice) => {
    setTestingVoice(voice);
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hi! I'm Connie speaking with the ${OPENAI_VOICES[voice].name} voice. This is how I'll sound during our conference chat.`,
          voice: voice,
          model: 'tts-1-hd'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setTestingVoice(null);
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setTestingVoice(null);
        };
        
        await audio.play();
      } else {
        setTestingVoice(null);
        console.error('Failed to test voice');
      }
    } catch (error) {
      setTestingVoice(null);
      console.error('Error testing voice:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Voice Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 text-white rounded-xl hover:bg-gray-700/50 transition-all duration-300 border border-indigo-500/30"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
        <span className="text-sm">
          Voice: {OPENAI_VOICES[selectedVoice].name}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Voice Options Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-indigo-500/30 shadow-xl z-50">
          <div className="p-4">
            <h3 className="text-white font-semibold mb-3">Choose Connie's Voice</h3>
            <div className="space-y-2">
              {Object.values(OPENAI_VOICES).map((voice) => (
                <div
                  key={voice.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    selectedVoice === voice.id
                      ? 'bg-indigo-600/30 border-indigo-500'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-indigo-500/50'
                  }`}
                  onClick={() => {
                    onVoiceChange(voice.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{voice.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        voice.gender === 'female' 
                          ? 'bg-pink-600/30 text-pink-200'
                          : voice.gender === 'male'
                          ? 'bg-blue-600/30 text-blue-200'
                          : 'bg-purple-600/30 text-purple-200'
                      }`}>
                        {voice.gender}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{voice.description}</p>
                    <p className="text-indigo-300 text-xs mt-1">Tone: {voice.tone}</p>
                  </div>
                  
                  {/* Test Voice Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      testVoice(voice.id);
                    }}
                    disabled={testingVoice === voice.id}
                    className={`ml-3 p-2 rounded-lg transition-all duration-200 ${
                      testingVoice === voice.id
                        ? 'bg-indigo-600 text-white animate-pulse'
                        : 'bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white'
                    }`}
                    title="Test this voice"
                  >
                    {testingVoice === voice.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};