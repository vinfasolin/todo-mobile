// src/push/pushToken.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const TOKEN_KEY = "todo_push_token_v1";

// comportamento padrão: como apresentar quando chega uma notificação
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // compat: exemplos antigos
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,

    // ✅ exigidos em versões mais novas do expo-notifications
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function savePushToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export async function clearStoredPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function getExpoProjectId(): string | null {
  // Expo SDKs variam onde o projectId aparece
  const id =
    (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    (Constants as any)?.expoConfig?.owner?.projectId; // fallback improvável
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

/**
 * Retorna o EXPO push token (ideal para seu micro-serviço PHP chamar a Expo Push API).
 * - Emulador geralmente não recebe push.
 * - No Android, cria o channel "default".
 * - Reaproveita token salvo para não pedir permissão/gerar token à toa.
 */
export async function registerForPushToken(): Promise<string | null> {
  // ✅ reaproveita token salvo
  const stored = await getStoredPushToken();
  if (stored) return stored;

  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    } catch {
      // ignore
    }
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (status !== "granted") return null;

  // ✅ Expo Push Token (passando projectId quando disponível)
  const projectId = getExpoProjectId();

  const tokenRes = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenRes?.data;
  if (typeof token !== "string" || !token.trim()) return null;

  await savePushToken(token);
  return token;
}