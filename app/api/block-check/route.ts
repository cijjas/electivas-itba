import { NextRequest, NextResponse } from 'next/server';
import { isIpBlocked, isFingerprintBlocked } from '@/lib/admin-utils';

export async function POST(request: NextRequest) {
  try {
    const { ip, fingerprint } = await request.json();

    // Check if either IP or fingerprint is blocked
    const [ipBlocked, fingerprintBlocked] = await Promise.all([
      ip ? isIpBlocked(ip) : Promise.resolve(false),
      fingerprint ? isFingerprintBlocked(fingerprint) : Promise.resolve(false)
    ]);

    return NextResponse.json({
      blocked: ipBlocked || fingerprintBlocked,
      ipBlocked,
      fingerprintBlocked
    });

  } catch (error) {
    console.error('Block check error:', error);
    // Return not blocked on error to avoid false positives
    return NextResponse.json({ 
      blocked: false, 
      ipBlocked: false, 
      fingerprintBlocked: false 
    });
  }
} 