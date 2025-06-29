export async function ensureClientIp(): Promise<string | null> {
  const existing = document.cookie.match(/client_ip=([^;]+)/)?.[1];
  if (existing) return existing;

  try {
    const res = await fetch('/api/ip');
    const data = await res.json();
    document.cookie = `client_ip=${data.ip}; path=/; max-age=${60 * 60 * 24 * 365}`;
    return data.ip;
  } catch (error) {
    console.warn('Failed to get client IP:', error);
    return null;
  }
}

export function getClientIp(): string | null {
  return document.cookie.match(/client_ip=([^;]+)/)?.[1] || null;
}

export function getFingerprint(): string | null {
  return document.cookie.match(/fp=([^;]+)/)?.[1] || null;
} 