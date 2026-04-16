// app/login.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../src/auth/AuthProvider";
import { theme } from "../src/ui/theme";
import {
  AppShell, // ✅ importante p/ BusyOverlay
  Card,
  PrimaryButton,
  Title,
  Muted,
  TextField,
  SectionTitle,
} from "../src/ui/components";
import { KeyboardScreen } from "../src/ui/KeyboardScreen";
import { normalizeEmail } from "../src/utils/format";

let gsiLoaded = false;

function loadGsiScript(): Promise<void> {
  if (Platform.OS !== "web") return Promise.resolve();
  if (gsiLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const d: any = document;
    const existing = d.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      gsiLoaded = true;
      resolve();
      return;
    }
    const s = d.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      gsiLoaded = true;
      resolve();
    };
    s.onerror = () =>
      reject(new Error("Falha ao carregar Google Identity Services."));
    d.head.appendChild(s);
  });
}

export default function Login() {
  const router = useRouter();
  const {
    user,
    isBootstrapping,
    loginWithGoogleIdToken,
    loginWithPassword,
    isBusy,
    setBusy,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const gsiBtnRef = useRef<HTMLDivElement | null>(null);
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    if (!isBootstrapping && user) router.replace("/(drawer)");
  }, [user, isBootstrapping, router]);

  // Web: renderiza botão GIS dentro de um container
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    (async () => {
      try {
        setGsiReady(false);
        await loadGsiScript();
        if (cancelled) return;

        const w: any = window as any;
        if (!w.google?.accounts?.id) return;

        // ✅ força o Google a não “lembrar” automaticamente a última conta
        try {
          w.google.accounts.id.disableAutoSelect?.();
        } catch {}

        if (gsiBtnRef.current) gsiBtnRef.current.innerHTML = "";

        w.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false, // ✅ evita auto-seleção
          cancel_on_tap_outside: true,
          callback: async (resp: any) => {
            const idToken = resp?.credential;
            if (!idToken) return;

            try {
              setBusy(true, "Validando Google…");
              await loginWithGoogleIdToken(idToken);
              router.replace("/(drawer)");
            } catch (e: any) {
              Alert.alert(
                "Falha no login",
                e?.message || "Não foi possível entrar."
              );
            } finally {
              setBusy(false);
              // ✅ garante que na próxima tentativa ele volte a perguntar a conta
              try {
                w.google.accounts.id.disableAutoSelect?.();
              } catch {}
            }
          },
        });

        if (gsiBtnRef.current) {
          w.google.accounts.id.renderButton(gsiBtnRef.current, {
            theme: "outline",
            size: "large",
            shape: "pill",
            width: 320,
            text: "continue_with",
          });
          setGsiReady(true);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogleIdToken, router, setBusy]);

  async function onLoginLocal() {
    const e = normalizeEmail(email);
    if (!e || !pass) return;

    try {
      setBusy(true, "Entrando…");
      await loginWithPassword(e, pass);
      router.replace("/(drawer)");
    } catch (err: any) {
      Alert.alert("Falha no login", err?.message || "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function onAndroidGoogle() {
    try {
      const mod = await import("@react-native-google-signin/google-signin");
      const { GoogleSignin } = mod as any;

      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!webClientId)
        throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID não configurado.");

      GoogleSignin.configure({ webClientId });

      setBusy(true, "Abrindo Google…");
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // ✅ força abrir o seletor de contas sempre
      try {
        await GoogleSignin.signOut();
      } catch {}

      const userInfo = await GoogleSignin.signIn();
      const idToken =
        userInfo?.idToken || (await GoogleSignin.getTokens())?.idToken;

      if (!idToken)
        throw new Error("Não foi possível obter o ID Token do Google.");

      setBusy(true, "Validando Google…");
      await loginWithGoogleIdToken(idToken);
      router.replace("/(drawer)");
    } catch (e: any) {
      Alert.alert(
        "Falha no Google",
        e?.message || "Não foi possível entrar com Google."
      );
    } finally {
      setBusy(false);
    }
  }

  // ✅ REGRA: "Esqueci minha senha" só aparece quando o usuário está no modo email/senha
  const emailNormalized = normalizeEmail(email);
  const showForgot = emailNormalized.includes("@");

  const loginDisabled = !email.trim() || !pass || isBusy;

  return (
    <AppShell>
      <KeyboardScreen>
        <View style={{ gap: 12 }}>
          <Title>Entrar</Title>
          <Muted>Use Google ou email/senha para acessar suas tarefas.</Muted>

          <Card>
            <SectionTitle>Email e senha</SectionTitle>
            <View style={{ height: 10 }} />

            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isBusy}
            />

            <View style={{ height: 10 }} />

            <TextField
              value={pass}
              onChangeText={setPass}
              placeholder="Senha"
              secureTextEntry
              editable={!isBusy}
            />

            <View style={{ height: 12 }} />

            <PrimaryButton
              label={isBusy ? "Entrando…" : "Entrar"}
              onPress={onLoginLocal}
              disabled={loginDisabled}
              loading={false}
            />

            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => router.push("/register")}
              disabled={isBusy}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
                paddingVertical: 6,
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              <Ionicons
                name="person-add-outline"
                size={18}
                color={theme.accent}
              />
              <Text style={{ color: theme.accent, fontWeight: "900" }}>
                Criar conta
              </Text>
            </Pressable>

            {showForgot ? (
              <Pressable
                onPress={() => router.push("/forgot-password")}
                disabled={isBusy}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "center",
                  paddingVertical: 6,
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={18}
                  color={theme.accent}
                />
                <Text style={{ color: theme.accent, fontWeight: "900" }}>
                  Esqueci minha senha
                </Text>
              </Pressable>
            ) : null}

            <View style={{ height: 12 }} />
            <View style={{ height: 1, backgroundColor: theme.line }} />
            <View style={{ height: 12 }} />

            {Platform.OS === "web" ? (
              <View style={{ width: "100%", alignItems: "center" }}>
                {/* container do botão GIS */}
                <View
                  // @ts-ignore web-only
                  ref={gsiBtnRef}
                  style={{
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 4,
                    opacity: isBusy ? 0.7 : 1,
                  }}
                />
                {!gsiReady ? (
                  <View
                    style={{
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      flexDirection: "row",
                      marginTop: 6,
                    }}
                  >
                    <ActivityIndicator />
                    <Muted>Carregando Google…</Muted>
                  </View>
                ) : null}
              </View>
            ) : (
              <Pressable
                onPress={onAndroidGoogle}
                disabled={isBusy}
                style={({ pressed }) => [
                  {
                    height: 52,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.accent,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isBusy ? 0.65 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  {isBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="logo-google" size={18} color="#fff" />
                  )}
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                    {isBusy ? "Aguarde…" : "Continuar com Google"}
                  </Text>
                </View>
              </Pressable>
            )}

            {Platform.OS !== "web" ? (
              <>
                <View style={{ height: 10 }} />
                <Muted style={{ fontSize: 14 }}>
                  Dica: no Android, Google funciona no Dev Client / APK (não no Expo Go).
                </Muted>
              </>
            ) : null}
          </Card>
        </View>
      </KeyboardScreen>
    </AppShell>
  );
}