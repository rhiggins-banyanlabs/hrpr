// components/AdminButton.tsx
"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";

/** Props **/
interface AdminButtonProps {
  onClick: () => void;        // e.g. () => router.push("/admin")
}

/** Component **/
export const AdminButton: React.FC<AdminButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="
      fixed top-4 right-4 z-50
      group flex items-center gap-2
      px-4 py-2 rounded-xl backdrop-blur-sm
      border border-indigo-500/30
      bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20
      hover:from-indigo-600/30 hover:via-purple-600/30 hover:to-blue-600/30
      transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20
    "
  >
    <LayoutGrid className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300" />
    <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
      Admin
    </span>
  </button>
);
