import { useEffect, useState } from 'react';

/**
 * Hook to read Server-Sent Events (SSE) from a `ReadableStream` returned
 * by the WorkflowService `executeWorkflowStream` method. It parses the
 * standard `data:` lines and converts them to JSON objects.
 *
 * Usage:
 * const { events, error, isFinished } = useSSE(stream);
 */
export interface SSEEvent {
  /** Raw JSON payload coming from backend */
  [key: string]: any;
}

export const useSSE = (stream: ReadableStream | null) => {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let cancelled = false;

    const processChunk = (chunkValue: string) => {
      buffer += chunkValue;
      // Split by double newline which delimits SSE events
      const parts = buffer.split('\n\n');
      // Keep last partial segment in buffer
      buffer = parts.pop() || '';

      parts.forEach(part => {
        // Each part may have lines like "data: {json}\n"
        const dataLine = part.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) return;
        const jsonStr = dataLine.replace(/^data:\s*/, '').trim();
        if (!jsonStr) return;
        try {
          const evt = JSON.parse(jsonStr);
          setEvents(prev => [...prev, evt]);
        } catch (e) {
          console.warn('Failed to parse SSE payload', e);
        }
      });
    };

    const pump = () => {
      reader.read().then(({ done, value }) => {
        if (cancelled) return;
        if (done) {
          setIsFinished(true);
          reader.releaseLock();
          return;
        }
        const chunkText = decoder.decode(value, { stream: true });
        processChunk(chunkText);
        pump();
      }).catch(err => {
        if (!cancelled) setError(err);
      });
    };

    pump();

    return () => {
      cancelled = true;
      try {
        reader.cancel();
      } catch (_) { /* ignore */ }
    };
  }, [stream]);

  return { events, error, isFinished } as const;
}; 