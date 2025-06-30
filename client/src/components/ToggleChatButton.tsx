// components/ChatToggleButton.tsx
"use client";

import React from "react";
import { X } from "lucide-react"; // used for “Close Chat”

interface ChatToggleButtonProps {
  isOpen: boolean;        // true  ⇒ “Close Chat”
  onClick: () => void;    // toggle handler
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({
  isOpen,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="
        fixed top-4 left-4 z-50
        group flex items-center gap-2
        px-4 py-2 rounded-xl backdrop-blur-sm
        border border-indigo-500/30
        bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20
        hover:from-indigo-600/30 hover:via-purple-600/30 hover:to-blue-600/30
        transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20
      "
    >
      {isOpen ? (
        /* ───── “Close” icon ───── */
        <X className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300" />
      ) : (
        /* ───── gradient-stroke chat icon ───── */
        <svg viewBox="0 0 24 24" className="h-4 w-4">
          <defs>
            <linearGradient id="chatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"  stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5A8.5 8.5 0 0 1 21 11v.5z"
            fill="none"
            stroke="url(#chatGrad)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
        {isOpen ? "Close Chat" : "Open Chat"}
      </span>
    </button>
  );
};
