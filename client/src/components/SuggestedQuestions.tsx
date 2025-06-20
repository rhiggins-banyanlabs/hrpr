"use client";

import React from "react";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const questions = [
  "What is AIDA and how does it work?",
  "Can you show me a live demo of AIDA?",
  "What makes AIDA different from other AI assistants?",
  "How could AIDA help my organization?",
  "Is AIDA customizable for different industries?",
  "Tell me about the technology behind AIDA."
];

export const SuggestedQuestions = ({ onSelect }: SuggestedQuestionsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
      {questions.map((question, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(question)}
          className="
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
            hover:bg-white/10"
        >
          {question}
        </button>
      ))}
    </div>
  );
};
