// src/api/client.ts
import { Platform } from "react-native";
import { getToken } from "../storage/token";
import { events } from "../utils/events";

const BASE_RAW =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE ||
  "http://localhost:3000";

function normalizeBase(base: string) {
  const b = (base || "").trim();
  return b.endsWith("/") ? b.slice(0, -1) : b;
}
function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type ApiOptions = {
  method?: HttpMethod;
  body?: any; // object | FormData | string | undefined
  auth?: boolean; // auth:false => não injeta Bearer
  timeoutMs?: number;
  headers?: Record<string, string>; // opcional: headers extras/override
};

export const AUTH_EXPIRED_EVENT = "todo:auth-expired";

function isFormData(x: any) {
  // FormData existe no web e no RN; checagem segura:
  return (
    typeof x === "object" &&
    x &&
    typeof x.append === "function" &&
    String(x) === "[object FormData]"
  );
}

function isPlainObject(x: any) {
  return x !== null && typeof x === "object" && !Array.isArray(x) && !isFormData(x);
}

function pickErrorMessage(parsed: any) {
  if (!parsed) return null;

  const msg = parsed.message ?? parsed.error ?? parsed.raw ?? null;

  // ✅ Nest ValidationPipe costuma mandar message: string[]
  if (Array.isArray(msg)) return msg.filter(Boolean).join(", ");

  // alguns backends mandam errors: string[]
  if (Array.isArray(parsed.errors)) return parsed.errors.filter(Boolean).join(", ");

  if (typeof msg === "string") return msg;

  return null;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method: HttpMethod = opts.method || "GET";
  const base = normalizeBase(BASE_RAW);
  const p = normalizePath(path);
  const url = `${base}${p}`;

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    ...(opts.headers || {}),
  };

  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // ✅ body handling:
  // - FormData: NÃO setar Content-Type (fetch seta boundary)
  // - string: envia como está (caller define content-type se quiser)
  // - object: JSON
  const bodyProvided = opts.body !== undefined && opts.body !== null;

  let body: any = undefined;

  if (method === "GET") {
    // nunca envia body em GET
    body = undefined;
  } else if (bodyProvided) {
    if (isFormData(opts.body)) {
      body = opts.body;
      // garante que não fique preso em application/json
      if (headers["Content-Type"]) delete headers["Content-Type"];
    } else if (typeof opts.body === "string") {
      body = opts.body;
      // caller pode mandar headers.Content-Type manualmente
      if (!headers["Content-Type"]) headers["Content-Type"] = "text/plain";
    } else if (isPlainObject(opts.body) || Array.isArray(opts.body)) {
      body = JSON.stringify(opts.body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    } else {
      // fallback: tenta mandar como está
      body = opts.body;
      if (headers["Content-Type"]) delete headers["Content-Type"];
    }
  }

  const timeoutMs = opts.timeoutMs ?? 20000;

  const AC: any = (globalThis as any).AbortController;
  const controller = AC ? new AC() : null;

  let timer: any = null;
  if (controller) timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller ? controller.signal : undefined,
    });
  } catch (err: any) {
    if (timer) clearTimeout(timer);

    if (err?.name === "AbortError") {
      throw new Error("O servidor demorou para responder. Tente novamente.");
    }

    if (
      Platform.OS !== "web" &&
      (base.includes("localhost") || base.includes("127.0.0.1"))
    ) {
      throw new Error(
        "Não foi possível conectar ao servidor. Verifique EXPO_PUBLIC_API_BASE_URL."
      );
    }

    throw new Error("Sem conexão com o servidor. Verifique sua internet.");
  } finally {
    if (timer) clearTimeout(timer);
  }

  const raw = await res.text();

  // ✅ tenta JSON; se não for, parsed fica undefined e a gente preserva texto puro
  const parsed: any = raw ? safeJson(raw) : undefined;

  if (res.status === 401 || res.status === 403) {
    events.emit(AUTH_EXPIRED_EVENT, { status: res.status, path: p, data: parsed ?? raw });
  }

  if (!res.ok) {
    const extracted = pickErrorMessage(parsed);

    // se não veio JSON, tenta usar o texto cru (quando for curto)
    const fallbackText = extracted ?? (raw && raw.trim().length <= 160 ? raw.trim() : null);

    throw new Error(toUserMessage(fallbackText, res.status));
  }

  // ✅ se veio JSON, retorna JSON; se veio texto puro (ex.: "OK"), retorna texto
  return ((parsed !== undefined ? parsed : raw) as unknown) as T;
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    // IMPORTANTe: não embrulhar texto em {raw}, senão o caller nunca recebe string pura
    return undefined;
  }
}

function toUserMessage(extracted: any, status: number) {
  const text =
    typeof extracted === "string"
      ? extracted.trim()
      : extracted
      ? JSON.stringify(extracted)
      : "";

  if (text && text.length <= 160 && !text.toLowerCase().includes("stack")) {
    return text;
  }

  if (status === 400) return "Confira os dados e tente novamente.";
  if (status === 401 || status === 403) return "Sua sessão expirou. Entre novamente.";
  if (status === 404) return "Não encontrado.";
  if (status === 409) return "Já existe um registro com esses dados.";
  if (status === 429) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (status >= 500) return "Servidor indisponível. Tente novamente mais tarde.";
  return "Não foi possível concluir. Tente novamente.";
}