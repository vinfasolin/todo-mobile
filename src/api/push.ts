// src/api/push.ts
const PUSH_API_BASE_URL =
  process.env.EXPO_PUBLIC_PUSH_API_BASE_URL?.replace(/\/$/, "") || "";

type RegisterPushInput = {
  userId: string;
  token: string;
  platform: "android" | "ios" | "web";
  app: "todo-premium";
};

// timeout simples p/ não travar login caso API PHP esteja lenta
async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Registra o token de push do dispositivo na sua API PHP.
 * - Não deve quebrar o app se falhar.
 * - Retorna void e apenas loga erro.
 */
export async function registerPushTokenOnPhpApi(input: RegisterPushInput): Promise<void> {
  if (!PUSH_API_BASE_URL) return;

  const url = `${PUSH_API_BASE_URL}/register`;

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      12000
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.log("push register failed:", res.status, txt);
    }
  } catch (e: any) {
    // AbortError / rede / DNS etc — não derrubar login
    console.log("push register error:", e?.name || "Error", e?.message || String(e));
  }
}