// src/api/me.ts
import { api } from "./client";
import type { User } from "../auth/types";

export async function fetchMe() {
  return api<{ ok: true; user: User }>("/me", { timeoutMs: 25000 });
}