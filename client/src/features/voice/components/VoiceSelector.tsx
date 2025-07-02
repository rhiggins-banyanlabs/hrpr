import React, { useState } from 'react';
import { OpenAIVoice, OPENAI_VOICES, VoiceSelectorProps } from '../types/voice.types';

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="flex items-center">
          <span className="ml-3 block truncate">
            {OPENAI_VOICES[selectedVoice].name}
          </span>
        </span>
        <svg
          className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul className="py-1 text-sm text-gray-700" role="listbox">
            {Object.entries(OPENAI_VOICES).map(([key, voice]) => (
              <li key={key} className="group">
                <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100">
                  <button
                    onClick={() => {
                      onVoiceChange(key as OpenAIVoice);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left focus:outline-none"
                    role="option"
                    aria-selected={selectedVoice === key}
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${
                        selectedVoice === key ? 'text-indigo-600' : 'text-gray-900'
                      }`}>
                        {voice.name}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {voice.description} • {voice.gender} • {voice.tone}
                      </span>
                    </div>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      testVoice(key as OpenAIVoice);
                    }}
                    disabled={testingVoice !== null}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 disabled:opacity-50"
                    title="Test voice"
                  >
                    {testingVoice === key ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12h6m-6 0a3 3 0 106 0v-3a3 3 0 00-6 0v3z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VoiceSelector;