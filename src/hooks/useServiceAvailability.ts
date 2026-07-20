import { useCallback, useEffect, useRef, useState } from 'react';
import { checkServiceAvailability } from '../serviceAvailability';

export type ServiceAvailability = 'checking' | 'available' | 'unavailable';

export function useServiceAvailability() {
  const [status, setStatus] = useState<ServiceAvailability>('checking');
  const activeCheck = useRef<AbortController | null>(null);

  const retry = useCallback(async () => {
    activeCheck.current?.abort();

    const controller = new AbortController();
    activeCheck.current = controller;
    setStatus('checking');

    const isAvailable = await checkServiceAvailability({ signal: controller.signal });

    if (!controller.signal.aborted) {
      setStatus(isAvailable ? 'available' : 'unavailable');
    }
  }, []);

  useEffect(() => {
    void retry();

    return () => {
      activeCheck.current?.abort();
    };
  }, [retry]);

  useEffect(() => {
    if (status !== 'unavailable') return;

    const handleOnline = () => void retry();
    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, [retry, status]);

  return { status, retry };
}
