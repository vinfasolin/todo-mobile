import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "../src/ui/theme";
import { PrimaryButton } from "../src/ui/components";

export default function NotFound() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "900", color: theme.text }}>Página não encontrada</Text>
      <Text style={{ fontSize: 16, fontWeight: "600", color: theme.muted }}>
        Essa rota não existe. Volte para a tela inicial.
      </Text>
      <PrimaryButton label="Ir para início" onPress={() => router.replace("/")} />
    </View>
  );
}
