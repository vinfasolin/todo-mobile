// src/api/images.ts
import { Platform } from "react-native";

const BASE =
  process.env.EXPO_PUBLIC_IMAGES_API_BASE_URL ||
  "https://armazenamentoarquivos.com.br/api-images";

function normalizeBase(base: string) {
  const b = (base || "").trim();
  return b.endsWith("/") ? b.slice(0, -1) : b;
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function extractError(data: any, status: number) {
  const msg = (data && (data.message || data.error || data.raw)) || null;
  const text = typeof msg === "string" ? msg.trim() : "";
  if (text && text.length <= 160) return text;

  if (status === 400) return "Confira o arquivo e tente novamente.";
  if (status === 413) return "Arquivo muito grande.";
  if (status >= 500) return "Servidor indisponível. Tente novamente mais tarde.";
  return "Não foi possível enviar a imagem.";
}

async function buildFormData(params: {
  uri: string;
  filename: string;
  mimeType: string;
}) {
  const form = new FormData();

  // ✅ RN (iOS/Android): padrão correto
  if (Platform.OS !== "web") {
    form.append(
      "file",
      {
        uri: params.uri,
        name: params.filename,
        type: params.mimeType,
      } as any
    );
    return form;
  }

  // ✅ Web: precisamos anexar Blob/File (uri-object não funciona)
  // uri no web costuma ser blob:..., data:..., ou uma URL http(s)
  const resp = await fetch(params.uri);
  const blob = await resp.blob();

  // File existe no browser; se não existir por algum motivo, cai no blob mesmo.
  let file: any = blob;
  try {
    const FileCtor: any = (globalThis as any).File;
    if (typeof FileCtor === "function") {
      file = new FileCtor([blob], params.filename, { type: params.mimeType });
    }
  } catch {
    // ignore
  }

  form.append("file", file);
  return form;
}

export async function uploadImageMultipart(params: {
  uri: string;
  filename?: string;
  mimeType?: string;
  timeoutMs?: number;
}): Promise<{ ok: true; url: string }> {
  const base = normalizeBase(BASE);
  const url = `${base}/upload`;

  const filename = params.filename || `image_${Date.now()}.jpg`;
  const mimeType = params.mimeType || "image/jpeg";
  const timeoutMs = params.timeoutMs ?? 30000;

  const form = await buildFormData({ uri: params.uri, filename, mimeType });

  const AC: any = (globalThis as any).AbortController;
  const controller = AC ? new AC() : null;
  let timer: any = null;
  if (controller) timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      // ✅ não setar Content-Type (fetch define boundary)
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      body: form,
      signal: controller ? controller.signal : undefined,
    });
  } catch (err: any) {
    if (timer) clearTimeout(timer);

    if (err?.name === "AbortError") {
      throw new Error("O upload demorou para responder. Tente novamente.");
    }

    if (
      Platform.OS !== "web" &&
      (base.includes("localhost") || base.includes("127.0.0.1"))
    ) {
      throw new Error(
        "Não foi possível conectar ao servidor de imagens. Verifique EXPO_PUBLIC_IMAGES_API_BASE_URL."
      );
    }

    throw new Error("Sem conexão para enviar a imagem. Verifique sua internet.");
  } finally {
    if (timer) clearTimeout(timer);
  }

  const raw = await res.text();
  const data: any = raw ? safeJson(raw) : null;

  if (!res.ok) throw new Error(extractError(data, res.status));

  // ✅ aceita variações comuns do payload
  const imageUrl =
    (data && (data.url || data?.data?.url || data?.result?.url)) || null;

  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Upload OK, mas a API não retornou a URL da imagem.");
  }

  return { ok: true, url: imageUrl };
}