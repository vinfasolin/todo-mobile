// app/index.tsx
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth/AuthProvider";
import { theme } from "../src/ui/theme";

export default function Index() {
  const { user, isBootstrapping } = useAuth();
  const router = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (isBootstrapping) return;
    if (didRedirect.current) return;
    didRedirect.current = true;
    router.replace(user ? "/(drawer)" : "/login");
  }, [user, isBootstrapping, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        gap: 10,
      }}
    >
      <ActivityIndicator />
      <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 14 }}>
        Preparando seu ToDo Premium…
      </Text>
    </View>
  );
}
