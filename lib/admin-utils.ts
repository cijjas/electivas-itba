import { kv } from '@/lib/kv-wrapper';
import type { Comment } from './types';


export async function getCommentAnalytics(subjectId: string): Promise<{
  totalComments: number;
  uniqueIps: number;
  uniqueFingerprints: number;
  suspiciousPatterns: {
    sameIpMultipleFingerprints: string[];
    sameFingerprintMultipleIps: string[];
    highVolumeIps: string[];
  };
}> {
  // Get all comments for a subject
  const comments = await kv.get<Comment[]>(`subject:${subjectId}:comments`) || [];
  
  const ips = new Set<string>();
  const fingerprints = new Set<string>();
  const ipToFingerprints = new Map<string, Set<string>>();
  const fingerprintToIps = new Map<string, Set<string>>();
  const ipCommentCounts = new Map<string, number>();
  
  comments.forEach(comment => {
    if (comment.ip) {
      ips.add(comment.ip);
      ipCommentCounts.set(comment.ip, (ipCommentCounts.get(comment.ip) || 0) + 1);
      
      if (comment.fingerprint) {
        if (!ipToFingerprints.has(comment.ip)) {
          ipToFingerprints.set(comment.ip, new Set());
        }
        ipToFingerprints.get(comment.ip)!.add(comment.fingerprint);
      }
    }
    
    if (comment.fingerprint) {
      fingerprints.add(comment.fingerprint);
      
      if (comment.ip) {
        if (!fingerprintToIps.has(comment.fingerprint)) {
          fingerprintToIps.set(comment.fingerprint, new Set());
        }
        fingerprintToIps.get(comment.fingerprint)!.add(comment.ip);
      }
    }
  });
  
  // Detect suspicious patterns
  const sameIpMultipleFingerprints: string[] = [];
  const sameFingerprintMultipleIps: string[] = [];
  const highVolumeIps: string[] = [];
  
  // IPs with multiple fingerprints (potential device spoofing)
  ipToFingerprints.forEach((fps, ip) => {
    if (fps.size > 3) { // More than 3 different fingerprints from same IP
      sameIpMultipleFingerprints.push(ip);
    }
  });
  
  // Fingerprints with multiple IPs (user changing networks frequently)
  fingerprintToIps.forEach((ips, fp) => {
    if (ips.size > 2) { // Same fingerprint from more than 2 IPs
      sameFingerprintMultipleIps.push(fp);
    }
  });
  
  // High volume IPs (potential spam)
  ipCommentCounts.forEach((count, ip) => {
    if (count > 10) { // More than 10 comments from single IP
      highVolumeIps.push(ip);
    }
  });
  
  return {
    totalComments: comments.length,
    uniqueIps: ips.size,
    uniqueFingerprints: fingerprints.size,
    suspiciousPatterns: {
      sameIpMultipleFingerprints,
      sameFingerprintMultipleIps,
      highVolumeIps,
    },
  };
}

export async function blockIp(ip: string): Promise<void> {
  await kv.set(`blocked-ip:${ip}`, true);
}

export async function blockFingerprint(fingerprint: string): Promise<void> {
  await kv.set(`blocked-fp:${fingerprint}`, true);
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  return (await kv.get<boolean>(`blocked-ip:${ip}`)) || false;
}

export async function isFingerprintBlocked(fingerprint: string): Promise<boolean> {
  return (await kv.get<boolean>(`blocked-fp:${fingerprint}`)) || false;
}

export async function unblockIp(ip: string): Promise<void> {
  await kv.set(`blocked-ip:${ip}`, null);
}

export async function unblockFingerprint(fingerprint: string): Promise<void> {
  await kv.set(`blocked-fp:${fingerprint}`, null);
} 