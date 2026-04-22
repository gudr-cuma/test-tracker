const SESSION_COOKIE = 'tt_session';
const SESSION_HOURS = 8;

export function generateSessionId() {
  return crypto.randomUUID();
}

export function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k.trim() === name) return v.join('=').trim();
  }
  return null;
}

export function getSessionId(request) {
  return parseCookie(request.headers.get('Cookie') || '', SESSION_COOKIE);
}

export function buildSessionCookie(sessionId, hours = SESSION_HOURS) {
  return [
    `${SESSION_COOKIE}=${sessionId}`,
    `Max-Age=${hours * 3600}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

export function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    'unknown'
  );
}

export function sessionExpiresAt(hours = SESSION_HOURS) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}
