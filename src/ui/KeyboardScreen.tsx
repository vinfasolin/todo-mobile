// src/ui/KeyboardScreen.tsx
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
  RefreshControl,
  RefreshControlProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "./theme";

export function KeyboardScreen({
  children,
  contentStyle,
  refreshing,
  onRefresh,
  refreshControlProps,
}: {
  children: React.ReactNode;
  contentStyle?: ViewStyle;

  // ✅ pull-to-refresh (opcional)
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshControlProps?: Omit<RefreshControlProps, "refreshing" | "onRefresh">;
}) {
  const canRefresh = typeof refreshing === "boolean" && !!onRefresh;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={
            canRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={() => {
                  // suporta async sem travar UI
                  try {
                    const r = onRefresh?.();
                    if (r && typeof (r as any).then === "function") {
                      // noop: quem controla refreshing é o caller
                      (r as Promise<any>).catch(() => {});
                    }
                  } catch {}
                }}
                tintColor={theme.accent}
                colors={[theme.accent]}
                {...(refreshControlProps || {})}
              />
            ) : undefined
          }
          contentContainerStyle={[
            {
              flexGrow: 1, // ✅ evita conteúdo “colado” e melhora o layout
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 18, // ✅ evita cortar no rodapé
              gap: 12,
            },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}