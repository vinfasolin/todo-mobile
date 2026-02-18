import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "todo_api_jwt_v1";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return window.localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
