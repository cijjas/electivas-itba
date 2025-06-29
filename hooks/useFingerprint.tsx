import { useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export function useFingerprint() {
  const [fp, setFp] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const cached = document.cookie.match(/fp=([^;]+)/)?.[1];
      if (cached) return setFp(cached);

      try {
        const agent = await FingerprintJS.load();
        const { visitorId } = await agent.get();
        document.cookie = `fp=${visitorId}; path=/; max-age=${60 * 60 * 24 * 365}`;
        setFp(visitorId);
      } catch (error) {
        console.warn('Failed to generate fingerprint:', error);
        setFp(null);
      }
    })();
  }, []);

  return fp;
} 