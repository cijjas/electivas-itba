import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0';
  
  return NextResponse.json({ ip });
} 