import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/AuthProvider";
import { Card, PremiumHeader, PrimaryButton, Screen } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";

export default function ProfileScreen() {
  const { user, logout, refreshMe, isBootstrapping } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user]);

  if (!user) return null;

  return (
    <Screen>
      <PremiumHeader title="Perfil" subtitle="Sua conta e sessão" />
      <View style={{ padding: 16, gap: 12 }}>
        <Card style={{ alignItems: "center", gap: 10 }}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={{ width: 78, height: 78, borderRadius: 39 }} />
          ) : null}
          <Text style={{ color: theme.text, fontWeight: "900", fontSize: 18 }}>
            {user.name || "Usuário"}
          </Text>
          <Text style={{ color: theme.muted }}>{user.email}</Text>
        </Card>

        <PrimaryButton
          label={busy ? "Atualizando..." : "Recarregar /me"}
          onPress={async () => {
            setBusy(true);
            try {
              await refreshMe();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
        />

        <Pressable
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
          style={{
            borderWidth: 1,
            borderColor: theme.line,
            borderRadius: 14,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "900", textAlign: "center" }}>
            Sair
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
