import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { clearToken, getToken, setToken } from "../storage/token";

export type User = {
  id: string;
  email: string;
  googleSub: string;
  name?: string | null;
  picture?: string | null;
};

type Ctx = {
  user: User | null;
  isBootstrapping: boolean;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setBoot] = useState(true);

  async function refreshMe() {
    const res = await api<{ ok: true; user: User }>("/me");
    setUser(res.user);
  }

  async function loginWithGoogleIdToken(idToken: string) {
    const res = await api<{ ok: true; token: string; user: User }>(
      "/auth/google",
      { method: "POST", body: { idToken }, auth: false }
    );
    await setToken(res.token);
    setUser(res.user);
  }

  async function logout() {
    await clearToken();
    setUser(null);
  }

  useEffect(() => {
    (async () => {
      try {
        const t = await getToken();
        if (t) await refreshMe();
      } catch {
        await clearToken();
        setUser(null);
      } finally {
        setBoot(false);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({ user, isBootstrapping, loginWithGoogleIdToken, logout, refreshMe }),
    [user, isBootstrapping]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
