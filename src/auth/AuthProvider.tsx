// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { AUTH_EXPIRED_EVENT, api } from "../api/client";
import { events } from "../utils/events";
import { clearToken, getToken, setToken } from "../storage/token";
import type { User } from "./types";
import { authGoogle, authLogin, authRegister } from "../api/auth";
import { fetchMe } from "../api/me";

// ✅ PUSH
import { registerForPushToken, clearStoredPushToken } from "../push/pushToken";
import { registerPushTokenOnPhpApi } from "../api/push";

type Ctx = {
  user: User | null;
  isBootstrapping: boolean;

  isBusy: boolean;
  busyMessage: string | null;
  setBusy: (v: boolean, msg?: string | null) => void;

  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (name: string, email: string, password: string) => Promise<void>;

  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setBoot] = useState(true);

  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);

  // ✅ evita registrar push repetidamente quando o user muda mas o token já foi enviado nessa sessão
  const didRegisterPushForUser = useRef<string | null>(null);

  function setBusy(v: boolean, msg: string | null = null) {
    setIsBusy(v);
    setBusyMessage(v ? msg || null : null);
  }

  async function warmupServer() {
    try {
      await api<any>("/", { auth: false, timeoutMs: 25000 });
    } catch {
      // ignore
    }
  }

  async function refreshMe() {
    const res = await fetchMe();
    setUser(res.user);
  }

  async function loginWithGoogleIdToken(idToken: string) {
    const res = await authGoogle(idToken);
    await setToken(res.token);
    setUser(res.user);
  }

  async function loginWithPassword(email: string, password: string) {
    const res = await authLogin(email, password);
    await setToken(res.token);
    setUser(res.user);
  }

  async function registerWithPassword(name: string, email: string, password: string) {
    const reg = await authRegister(name, email, password);

    if (reg?.token && reg?.user) {
      await setToken(reg.token);
      setUser(reg.user);
      return;
    }
    await loginWithPassword(email, password);
  }

  async function logout() {
    try {
      await clearToken();
      // opcional: limpar push token salvo localmente
      await clearStoredPushToken();
    } finally {
      didRegisterPushForUser.current = null;
      setUser(null);
      setBusy(false);
    }
  }

  // ✅ bootstrap inicial
  useEffect(() => {
    let alive = true;

    (async () => {
      setBusy(true, "Preparando sua sessão…");
      try {
        await warmupServer();

        const t = await getToken();
        if (t) {
          try {
            await refreshMe();
          } catch {
            await clearToken();
            if (alive) setUser(null);
          }
        }
      } catch {
        await clearToken();
        if (alive) setUser(null);
      } finally {
        if (alive) {
          setBusy(false);
          setBoot(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ auto logout por evento do client (401/403)
  useEffect(() => {
    const off = events.on(AUTH_EXPIRED_EVENT, async () => {
      await logout();
    });
    return off;
  }, []);

  // ✅ PUSH: quando usuário logar/refreshMe, registrar token local e enviar para API PHP
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!user?.id) return;

      // evita repetir registro nessa sessão pro mesmo user
      if (didRegisterPushForUser.current === user.id) return;

      try {
        const token = await registerForPushToken();

        if (!alive) return;
        if (!token) return; // sem permissão, emulador, etc.

        const platform =
          Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "web";

        await registerPushTokenOnPhpApi({
          userId: user.id,
          token,
          platform,
          app: "todo-premium",
        });

        didRegisterPushForUser.current = user.id;
      } catch (e: any) {
        // push nunca deve derrubar o app / sessão
        console.log("push init error:", e?.message || String(e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const value = useMemo<Ctx>(
    () => ({
      user,
      isBootstrapping,
      isBusy,
      busyMessage,
      setBusy,
      loginWithGoogleIdToken,
      loginWithPassword,
      registerWithPassword,
      logout,
      refreshMe,
    }),
    [user, isBootstrapping, isBusy, busyMessage]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}