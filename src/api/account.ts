// src/api/account.ts
import { api } from "./client";
import type { User } from "../auth/types";

export async function patchMe(data: { name?: string; picture?: string }) {
  return api<{ ok: true; user: User }>("/me", {
    method: "PATCH",
    body: data,
  });
}

export async function patchMeEmail(email: string, password: string) {
  // ✅ backend canônico (DTO ChangeEmailDto): { newEmail, password }
  return api<{ ok: true; token: string; user: User }>("/me/email", {
    method: "PATCH",
    body: { newEmail: email, password },
  });
}

export async function patchMePassword(currentPassword: string, newPassword: string) {
  return api<{ ok: true }>("/me/password", {
    method: "PATCH",
    body: { currentPassword, newPassword },
  });
}

export async function deleteMe(password?: string) {
  // ✅ mais robusto que body em DELETE (alguns ambientes ignoram body)
  // backend: conta local exige password; conta Google não
  if (password) {
    const qs = new URLSearchParams();
    qs.set("password", password);
    return api<{ ok: true }>(`/me?${qs.toString()}`, { method: "DELETE" });
  }

  return api<{ ok: true }>("/me", { method: "DELETE" });
}