// app/_layout.tsx
import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

import * as Notifications from "expo-notifications";

import { AuthProvider } from "../src/auth/AuthProvider";

// ✅ Handler global: como mostrar quando chega notificação (inclusive em foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,

    // ✅ exigidos em versões mais novas do expo-notifications
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // ✅ Android: garante que existe um channel "default" (necessário para alert/som)
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        // opcional:
        // vibrationPattern: [0, 250, 250, 250],
        // lightColor: "#FF231F7C",
      }).catch(() => {});
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ✅ Evita conteúdo colar/entrar na StatusBar (principalmente Android) */}
      <StatusBar style="dark" translucent={false} />

      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />

          {/* ✅ telas públicas */}
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />

          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}