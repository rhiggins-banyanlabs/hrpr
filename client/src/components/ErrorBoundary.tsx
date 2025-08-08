import React from 'react';

interface ErrorBoundaryProps {
  error: string;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ error }) => (
  <div className="relative h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-black">
    <div className="text-center text-red-400 max-w-md">
      <h2 className="text-2xl font-bold mb-4">Permission Required</h2>
      <p>{error}</p>
    </div>
  </div>
);