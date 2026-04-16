// src/api/auth.ts
import { api } from "./client";
import type { User } from "../auth/types";

export async function authGoogle(idToken: string) {
  return api<{ ok: true; token: string; user: User }>("/auth/google", {
    method: "POST",
    body: { idToken },
    auth: false,
    timeoutMs: 25000,
  });
}

export async function authLogin(email: string, password: string) {
  return api<{ ok: true; token: string; user: User }>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
    timeoutMs: 25000,
  });
}

export async function authRegister(name: string, email: string, password: string) {
  // ✅ alinhado com o backend novo e com o AuthProvider:
  // espera { ok:true, token, user }
  return api<{ ok: true; token: string; user: User }>("/auth/register", {
    method: "POST",
    body: { name, email, password },
    auth: false,
    timeoutMs: 25000,
  });
}

// ✅ recuperar senha
export async function forgotPassword(email: string) {
  return api<{ ok: true }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
    timeoutMs: 25000,
  });
}

// ✅ redefinir senha
export async function resetPassword(email: string, code: string, newPassword: string) {
  return api<{ ok: true }>("/auth/reset-password", {
    method: "POST",
    body: { email, code, newPassword },
    auth: false,
    timeoutMs: 25000,
  });
}