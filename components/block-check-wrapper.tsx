'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Loader2 } from 'lucide-react';

interface BlockCheckWrapperProps {
  children: React.ReactNode;
}

export default function BlockCheckWrapper({ children }: BlockCheckWrapperProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        // Generate fingerprint immediately
        const fp = await FingerprintJS.load();
        const { visitorId } = await fp.get();
        
        // Get client IP
        const ipResponse = await fetch('/api/ip');
        const ipData = await ipResponse.json();
        const clientIp = ipData.ip;

        // Check if blocked via public block-check API
        const response = await fetch('/api/block-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ip: clientIp,
            fingerprint: visitorId
          })
        });

        if (response.ok) {
          const blockData = await response.json();
          if (blockData.blocked) {
            setIsBlocked(true);
            router.push('/blocked');
            return;
          }
        }

        // Save fingerprint to cookie for future use
        document.cookie = `fp=${visitorId}; path=/; max-age=${60 * 60 * 24 * 365}`;
        
      } catch (error) {
        console.warn('Block check failed:', error);
        // Continue anyway - don't block users if check fails
      } finally {
        setIsChecking(false);
      }
    };

    checkBlockStatus();
  }, [router]);

  // Show loading while checking
  if (isChecking) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-gray-900" />
          <p className="text-gray-600 text-base">Cargando...</p>
        </div>
      </div>
    );
  }

  // Don't render children if blocked (though redirect should happen)
  if (isBlocked) {
    return null;
  }

  return <>{children}</>;
} 