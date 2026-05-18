const SESSION_KEY = "memoire_session_id";

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export function getGuestSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  // Anonymous guest identity: no account, just a stable browser UUID for quotas and rate limits.
  const sessionId = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
  localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}
