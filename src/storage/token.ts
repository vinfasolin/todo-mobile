// src/storage/token.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "todo_api_jwt_v1";

function getLocalStorageSafe(): Storage | null {
  try {
    const g: any = globalThis as any;
    const ls = g?.localStorage;
    if (!ls) return null;

    const k = "__ls_test__";
    ls.setItem(k, "1");
    ls.removeItem(k);

    return ls as Storage;
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    const ls = getLocalStorageSafe();
    return ls?.getItem(KEY) ?? null;
  }

  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    const ls = getLocalStorageSafe();
    try {
      ls?.setItem(KEY, token);
    } catch {}
    return;
  }

  try {
    await SecureStore.setItemAsync(KEY, token);
  } catch {}
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    const ls = getLocalStorageSafe();
    try {
      ls?.removeItem(KEY);
    } catch {}
    return;
  }

  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
