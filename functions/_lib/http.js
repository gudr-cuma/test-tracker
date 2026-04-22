const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export function json(data, init = {}) {
  const headers = { ...JSON_HEADERS, ...(init.headers || {}) };
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status, message, details) {
  return json(
    details ? { error: message, details } : { error: message },
    { status },
  );
}

export function methodNotAllowed(allow) {
  return new Response(`Method not allowed`, {
    status: 405,
    headers: { Allow: allow.join(', ') },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function uuid() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}
