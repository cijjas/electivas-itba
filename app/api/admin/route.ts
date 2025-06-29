import { NextRequest, NextResponse } from 'next/server';
import { 
  getCommentAnalytics, 
  blockIp, 
  blockFingerprint, 
  unblockIp, 
  unblockFingerprint,
  isIpBlocked,
  isFingerprintBlocked
} from '@/lib/admin-utils';
import { getSubjectComments } from '@/lib/kv';



export async function POST(request: NextRequest) {
  try {
    // Check for admin secret key
    const adminSecret = request.headers.get('x-admin-secret');
    const envSecret = process.env.ADMIN_SECRET_KEY;
    
    
    if (!adminSecret || adminSecret !== envSecret) {
      return NextResponse.json({ 
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const { action, ip, fingerprint, subjectId } = await request.json();

    switch (action) {
      case 'block_ip':
        if (!ip) return NextResponse.json({ error: 'IP required' }, { status: 400 });
        await blockIp(ip);
        return NextResponse.json({ success: true, message: `IP ${ip} blocked` });

      case 'block_fingerprint':
        if (!fingerprint) return NextResponse.json({ error: 'Fingerprint required' }, { status: 400 });
        await blockFingerprint(fingerprint);
        return NextResponse.json({ success: true, message: `Fingerprint ${fingerprint} blocked` });

      case 'unblock_ip':
        if (!ip) return NextResponse.json({ error: 'IP required' }, { status: 400 });
        await unblockIp(ip);
        return NextResponse.json({ success: true, message: `IP ${ip} unblocked` });

      case 'unblock_fingerprint':
        if (!fingerprint) return NextResponse.json({ error: 'Fingerprint required' }, { status: 400 });
        await unblockFingerprint(fingerprint);
        return NextResponse.json({ success: true, message: `Fingerprint ${fingerprint} unblocked` });

      case 'check_status':
        const results = await Promise.all([
          ip ? isIpBlocked(ip) : Promise.resolve(false),
          fingerprint ? isFingerprintBlocked(fingerprint) : Promise.resolve(false)
        ]);
        return NextResponse.json({
          ip: ip || null,
          fingerprint: fingerprint || null,
          ipBlocked: results[0],
          fingerprintBlocked: results[1]
        });

      case 'get_analytics':
        if (!subjectId) return NextResponse.json({ error: 'Subject ID required' }, { status: 400 });
        const analytics = await getCommentAnalytics(subjectId);
        return NextResponse.json(analytics);

      case 'get_comments':
        if (!subjectId) return NextResponse.json({ error: 'Subject ID required' }, { status: 400 });
        const comments = await getSubjectComments(subjectId);
        // Return comments with tracking data (if available)
        const commentsWithTracking = comments.map((comment: any) => ({
          id: comment.id,
          text: comment.text.substring(0, 100) + (comment.text.length > 100 ? '...' : ''), // Truncate for preview
          timestamp: comment.timestamp,
          likes: comment.likes,
          hidden: comment.hidden,
          ip: comment.ip || 'N/A',
          fingerprint: comment.fingerprint || 'N/A',
          date: new Date(comment.timestamp).toLocaleString()
        }));
        return NextResponse.json({
          subjectId,
          totalComments: comments.length,
          comments: commentsWithTracking
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 