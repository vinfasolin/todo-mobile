import "react-native-gesture-handler";
import { Stack } from "expo-router";
import React from "react";
import { AuthProvider } from "../src/auth/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="todo/[id]" />
      </Stack>
    </AuthProvider>
  );
}
