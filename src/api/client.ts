import { getToken } from "../storage/token";

const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE ||
  "http://localhost:3000";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export async function api<T>(
  path: string,
  opts: { method?: HttpMethod; body?: any; auth?: boolean } = {}
): Promise<T> {
  const method = opts.method || "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const raw = await res.text();
  const data = raw ? safeJson(raw) : null;

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `HTTP ${res.status} em ${path}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return data as T;
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}
