import React from "react";

interface ErrorDisplayComponentProps {
  error: string | null;
}

export default function ErrorDisplayComponent({
  error,
}: ErrorDisplayComponentProps) {
  if (!error) return null;

  return (
    <div className="absolute top-20 left-4 z-10 bg-red-50 border border-red-200 rounded-lg p-3 max-w-md">
      <div className="text-red-800 text-sm">{error}</div>
    </div>
  );
}
