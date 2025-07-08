import React, { useEffect, useRef, useState } from 'react';
import { useSSE } from '~/lib/useSSE';

interface StreamingModalProps {
  stream: ReadableStream | null;
  onClose: () => void;
}

const StreamingModal: React.FC<StreamingModalProps> = ({ stream, onClose }) => {
  const { events, error, isFinished } = useSSE(stream);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [buffer, setBuffer] = useState<string>('');

  // Concatenate token events
  useEffect(() => {
    const tokenEvents = events.filter(e => e.type === 'token');
    if (tokenEvents.length > 0) {
      setBuffer(prev => prev + tokenEvents.map(e => e.content ?? '').join(''));
    }
  }, [events]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buffer]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-xl font-medium mb-4">Streaming Output</h2>

        <pre className="bg-gray-100 p-4 rounded h-64 overflow-auto whitespace-pre-wrap text-sm">
          {buffer}
          {error && <span className="text-red-600">{error.message}</span>}
          {isFinished && <span className="text-green-600">\n\n[completed]</span>}
          <div ref={bottomRef} />
        </pre>
      </div>
    </div>
  );
};

export default StreamingModal; 