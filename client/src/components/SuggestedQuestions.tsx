"use client";

import React from "react";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  isConversationStarted: boolean;
  isHarperSpeaking?: boolean; // New prop
}

const questions = [
  "Can you tell me about the correctional facility tours?",
  "What is the ACA conference?",
  "Are there any coffee shops in the area?",
  "What organizations are attending the conference?",
  "What is the weather like in Denver?",
  "Are there any good restaurants in the area?",
  "What booth is Vantage located in?",
  "Who is speaking at the conference on Saturday?",
  "Can you tell me the conference schedule for this afternoon?",
];

export const SuggestedQuestions = ({ onSelect, isConversationStarted, isHarperSpeaking = false }: SuggestedQuestionsProps) => {
  // Don't render anything if conversation has started
  if (isConversationStarted) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
      {questions.map((question, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(question)}
          disabled={isHarperSpeaking} // Disable buttons while Harper is speaking
          className={`
            bg-gradient-to-br from-blue-500/60 via-indigo-500/60 to-purple-500/60
            backdrop-blur-md
            border border-indigo-400/60
            text-white 
            px-4 py-3 
            rounded-lg 
            shadow-md 
            transition-transform 
            transform 
            hover:scale-105 
            active:scale-95 
            hover:bg-white/10
            cursor-pointer
            disabled:opacity-50
            disabled:cursor-not-allowed
            disabled:hover:scale-100
            ${isHarperSpeaking ? 'pointer-events-none' : ''}
            `}
        >
          {question}
        </button>
      ))}
    </div>
  );
};