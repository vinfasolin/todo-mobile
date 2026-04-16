// app/(drawer)/index.tsx
import React, { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../src/auth/AuthProvider";
import { Screen, Title, Muted } from "../../src/ui/components";

import { useTodosLogic } from "./_todos.logic";
import { TodosUI } from "./_todos.ui";

export default function TodosScreen() {
  const { user, isBootstrapping, setBusy, isBusy } = useAuth();
  const router = useRouter();

  // 🔐 guard (área logada)
  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  // Enquanto o AuthProvider está bootstrapando, evita “piscar” a tela
  if (isBootstrapping) {
    return (
      <Screen padded>
        <View style={{ gap: 6 }}>
          <Title>Carregando…</Title>
          <Muted>Preparando sua sessão.</Muted>
        </View>
      </Screen>
    );
  }

  // Se não tem user (redirect vai ocorrer), render mínimo
  if (!user) {
    return (
      <Screen padded>
        <View style={{ gap: 6 }}>
          <Title>Acessando…</Title>
          <Muted>Redirecionando para login.</Muted>
        </View>
      </Screen>
    );
  }

  const logic = useTodosLogic({
    userId: user.id,
    isBootstrapping, // ✅ necessário pelo tipo do hook
    isBusy,
    setBusy: (busy, message) => setBusy(busy, message ?? null), // ✅ compat: hook espera string | undefined
    onRequireLogin: () => router.replace("/login"),
    // pageSize: 5, // (opcional) se você quiser forçar aqui
  });

  return <TodosUI logic={logic} isBusy={isBusy} />;
}