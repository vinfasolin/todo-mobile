import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth/AuthProvider";
import { theme } from "../src/ui/theme";

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

// ---------------- DEBUG HELPERS ----------------
const DBG = true; // <-- se quiser, deixe false depois

function dbg(...args: any[]) {
  if (!DBG) return;
  // eslint-disable-next-line no-console
  console.log("[LOGIN]", ...args);
}

function short(v?: string | null, n = 10) {
  if (!v) return "";
  if (v.length <= n) return v;
  return `${v.slice(0, n)}…(${v.length})`;
}

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

// ---------- WEB (GIS) ----------
declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.accounts?.id) return resolve();

    const existing = document.getElementById("gsi-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar GSI")));
      return;
    }

    const s = document.createElement("script");
    s.id = "gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar GSI"));
    document.head.appendChild(s);
  });
}

function WebGoogleLogin() {
  const { loginWithGoogleIdToken } = useAuth();
  const router = useRouter();

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const containerId = "gsi-btn-container";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        dbg("WEB init. clientId:", short(webClientId, 14));
        await loadGoogleScript();
        if (cancelled) return;

        if (!webClientId) {
          setErr("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID não definido no .env");
          return;
        }

        if (!window.google?.accounts?.id) {
          setErr("GSI não disponível (script não carregou corretamente).");
          return;
        }

        window.google.accounts.id.initialize({
          client_id: webClientId,
          callback: async (resp: any) => {
            try {
              setBusy(true);
              setErr(null);

              const idToken = resp?.credential;
              dbg("WEB callback resp keys:", Object.keys(resp || {}));
              dbg("WEB credential:", short(idToken, 24));
              if (!idToken) throw new Error("Não veio credential (ID Token) do Google.");

              await loginWithGoogleIdToken(idToken);
              router.replace("/(tabs)");
            } catch (e: any) {
              dbg("WEB login error:", e);
              setErr(e?.message || "Falha no login");
            } finally {
              setBusy(false);
            }
          },
        });

        const el = document.getElementById(containerId) as HTMLElement | null;
        if (!el) {
          setErr("Container do botão Google não encontrado.");
          return;
        }

        el.innerHTML = "";
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
        });
      } catch (e: any) {
        dbg("WEB init error:", e);
        if (!cancelled) setErr(e?.message || "Falha ao carregar login do Google");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [webClientId, loginWithGoogleIdToken, router]);

  return (
    <View style={{ gap: 10, alignItems: "center" }}>
      <View nativeID={containerId} style={{ width: 320, minHeight: 44 }} />

      {busy ? <ActivityIndicator /> : null}
      {err ? <Text style={{ color: theme.danger, textAlign: "center" }}>{err}</Text> : null}

      <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>
        Web (GIS): sem redirect_uri (não dá mismatch)
      </Text>
    </View>
  );
}

// ---------- ANDROID (Expo Go / Dev Client) ----------
function AndroidGoogleLogin() {
  const { loginWithGoogleIdToken } = useAuth();
  const router = useRouter();

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

  const a1 = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID_1 || "";
  const a2 = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID_2 || "";
  const a3 = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID_3 || "";
  const a4 = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID_4 || "";
  const androidClientId = useMemo(() => a1 || a2 || a3 || a4 || "", [a1, a2, a3, a4]);

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isExpoGo = Constants.appOwnership === "expo";

  // ✅ deixe igual ao Google Cloud (cadastre com e sem / para garantir)
  const proxyRedirectUri = useMemo(
    () => "https://auth.expo.io/@vinfasolin/todo-mobile-web-premium",
    []
  );

  const nativeRedirectUri = useMemo(() => {
    return AuthSession.makeRedirectUri({
      scheme: "todo-premium",
      path: "redirect",
    });
  }, []);

  const redirectUri = isExpoGo ? proxyRedirectUri : nativeRedirectUri;

  const missing = isExpoGo ? !webClientId : Platform.OS === "android" && (!webClientId || !androidClientId);

  // ✅ monta config com logs
  const requestConfig: any = useMemo(() => {
    const cfg: any = {
      webClientId: webClientId || undefined,
      iosClientId: iosClientId || undefined,
      redirectUri,
      responseType: "id_token",
      scopes: ["openid", "profile", "email"],
      usePKCE: false,
      extraParams: {
        nonce: "nonce",
        prompt: "select_account",
      },
    };

    if (!isExpoGo) cfg.androidClientId = androidClientId || undefined;

    return cfg;
  }, [webClientId, iosClientId, redirectUri, isExpoGo, androidClientId]);

  // ✅ cria request
  const [request, response, promptAsync] = Google.useAuthRequest(requestConfig);

  // ✅ debug de ciclo de vida
  useEffect(() => {
    dbg("ANDROID init:");
    dbg("  platform:", Platform.OS);
    dbg("  appOwnership:", Constants.appOwnership, "isExpoGo:", isExpoGo);
    dbg("  redirectUri:", redirectUri);
    dbg("  webClientId:", short(webClientId, 18));
    dbg("  androidClientId:", short(androidClientId, 18));
    dbg("  requestConfig:", requestConfig);
  }, [isExpoGo, redirectUri, webClientId, androidClientId, requestConfig]);

  // ✅ debug do request montado
  useEffect(() => {
    if (!request) return;
    dbg("REQUEST ready:");
    dbg("  request.type:", (request as any)?.type);
    dbg("  request.url:", (request as any)?.url);
    dbg("  request.redirectUri:", (request as any)?.redirectUri);
    dbg("  request.clientId:", (request as any)?.clientId);
  }, [request]);

  // ✅ debug do response
  useEffect(() => {
    if (!response) return;

    dbg("RESPONSE:", response?.type);
    dbg("  raw:", response);

    if ((response as any)?.type === "error") {
      const rp: any = response as any;
      dbg("  error:", rp?.error);
      dbg("  params:", rp?.params);
      // tenta pegar description comum
      const desc = rp?.params?.error_description || rp?.params?.error_description?.toString();
      if (desc) dbg("  error_description:", desc);
    }

    if (response?.type !== "success") return;

    const idToken = (response.params as any)?.id_token || (response.authentication as any)?.idToken;

    dbg("SUCCESS:");
    dbg("  params keys:", Object.keys((response as any)?.params || {}));
    dbg("  has authentication:", !!(response as any)?.authentication);
    dbg("  id_token:", short(idToken, 24));

    if (!idToken) {
      setErr("Não veio id_token do Google.");
      return;
    }

    (async () => {
      try {
        setBusy(true);
        setErr(null);
        await loginWithGoogleIdToken(idToken);
        router.replace("/(tabs)");
      } catch (e: any) {
        dbg("API loginWithGoogleIdToken error:", e);
        setErr(e?.message || "Falha no login");
      } finally {
        setBusy(false);
      }
    })();
  }, [response, loginWithGoogleIdToken, router]);

  const disabled = !request || busy || missing;

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        disabled={disabled}
        onPress={async () => {
          try {
            setErr(null);
            setBusy(true);

            dbg("PROMPT start");
            dbg("  using redirectUri:", redirectUri);
            dbg("  using client:", isExpoGo ? "WEB client (Expo Go)" : "ANDROID client (build)");
            dbg("  request.url:", (request as any)?.url);

            const r = await promptAsync({ showInRecents: true });
            dbg("PROMPT result:", r?.type, r);
          } catch (e: any) {
            dbg("PROMPT exception:", e);
            setErr(e?.message || "Falha ao abrir o login do Google");
          } finally {
            setBusy(false);
          }
        }}
        style={{
          backgroundColor: "#111827",
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 14,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text style={{ color: theme.text, fontWeight: "900", textAlign: "center", fontSize: 16 }}>
          {busy ? "Abrindo Google…" : "Continuar com Google (Android)"}
        </Text>

        <Text style={{ color: theme.muted, textAlign: "center", marginTop: 6 }}>
          {isExpoGo ? "Expo Go: Web Client + proxy auth.expo.io" : "Dev Client/APK: Android Client + scheme"}
        </Text>
      </Pressable>

      {missing ? (
        <Text style={{ color: theme.danger, textAlign: "center" }}>
          {isExpoGo
            ? "Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env"
            : "Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID e/ou ANDROID_CLIENT_ID_1..4 no .env"}
        </Text>
      ) : null}

      {err ? <Text style={{ color: theme.danger, textAlign: "center" }}>{err}</Text> : null}

      {/* Painel de debug na UI */}
      <View style={{ borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 12, gap: 6 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>Debug</Text>

        <Text style={{ color: theme.muted, fontSize: 12 }}>appOwnership: {String(Constants.appOwnership)}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>isExpoGo: {String(isExpoGo)}</Text>

        <Text style={{ color: theme.muted, fontSize: 12 }}>redirectUri:</Text>
        <Text style={{ color: theme.text, fontSize: 12 }}>{redirectUri}</Text>

        <Text style={{ color: theme.muted, fontSize: 12 }}>webClientId:</Text>
        <Text style={{ color: theme.text, fontSize: 12 }}>{webClientId || "(vazio)"}</Text>

        <Text style={{ color: theme.muted, fontSize: 12 }}>androidClientId (build):</Text>
        <Text style={{ color: theme.text, fontSize: 12 }}>{androidClientId || "(vazio)"}</Text>

        <Text style={{ color: theme.muted, fontSize: 12 }}>request.url (se disponível):</Text>
        <Text style={{ color: theme.text, fontSize: 12 }}>
          {(request as any)?.url ? String((request as any)?.url) : "(ainda não gerado)"}
        </Text>

        <Text style={{ color: theme.muted, fontSize: 12 }}>response.type:</Text>
        <Text style={{ color: theme.text, fontSize: 12 }}>{response?.type || "(nenhum)"}</Text>

        {response ? (
          <>
            <Text style={{ color: theme.muted, fontSize: 12 }}>response (JSON):</Text>
            <Text style={{ color: theme.text, fontSize: 12 }}>{pretty(response)}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const { isBootstrapping, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/(tabs)");
  }, [user, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={["#7C5CFF", "#0B0F17"]} style={{ paddingTop: 64, paddingHorizontal: 18, paddingBottom: 20 }}>
        <Text style={{ color: "#fff", fontSize: 30, fontWeight: "900" }}>To-Do Premium</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 8 }}>
          Login Google (ID Token) → sua API (JWT) → tarefas sincronizadas.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        {isBootstrapping ? (
          <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.line }}>
            <Text style={{ color: theme.text, fontWeight: "800" }}>Carregando sessão…</Text>
            <View style={{ height: 10 }} />
            <ActivityIndicator />
          </View>
        ) : null}

        {Platform.OS === "web" ? (
          <WebGoogleLogin />
        ) : Platform.OS === "android" ? (
          <AndroidGoogleLogin />
        ) : (
          <Text style={{ color: theme.muted, textAlign: "center" }}>Plataforma {Platform.OS}: login móvel não configurado.</Text>
        )}

        <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>
          API: {process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE}
        </Text>
      </ScrollView>
    </View>
  );
}
