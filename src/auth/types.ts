// src/auth/types.ts
export type User = {
  id: string;
  email: string;
  googleSub?: string | null;
  name?: string | null;
  picture?: string | null;
};