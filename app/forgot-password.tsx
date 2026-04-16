// app/forgot-password.tsx
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "../src/ui/theme";
import {
  AppShell, // ✅ BusyOverlay global
  Card,
  PrimaryButton,
  Title,
  Muted,
  TextField,
  SectionTitle,
} from "../src/ui/components";
import { KeyboardScreen } from "../src/ui/KeyboardScreen";
import { forgotPassword } from "../src/api/auth";
import { useAuth } from "../src/auth/AuthProvider";

function normalizeEmail(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function ForgotPassword() {
  const router = useRouter();
  const { isBusy, setBusy } = useAuth();

  const [email, setEmail] = useState("");

  async function onSend() {
    const e = normalizeEmail(email);
    if (!e.includes("@")) {
      Alert.alert("Email inválido", "Digite um e-mail válido.");
      return;
    }

    try {
      setBusy(true, "Enviando código…");
      await forgotPassword(e);

      Alert.alert(
        "Código enviado (se existir conta local)",
        "Se existir uma conta local com esse e-mail, enviamos um código. Verifique a caixa de entrada e o spam.",
        [
          {
            text: "Continuar",
            onPress: () =>
              router.push({
                pathname: "/reset-password",
                params: { email: e },
              }),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Falha", err?.message || "Não foi possível enviar o código.");
    } finally {
      setBusy(false);
    }
  }

  const canSend = normalizeEmail(email).includes("@") && !isBusy;

  return (
    <AppShell>
      <KeyboardScreen>
        <View style={{ gap: 12 }}>
          <Title>Recuperar senha</Title>
          <Muted>Informe seu e-mail para receber um código (somente conta local).</Muted>

          <Card>
            <SectionTitle>Email</SectionTitle>
            <View style={{ height: 10 }} />

            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isBusy}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSend) onSend();
              }}
            />

            <View style={{ height: 12 }} />

            <PrimaryButton
              label={isBusy ? "Enviando…" : "Enviar código"}
              onPress={onSend}
              disabled={!canSend}
              loading={isBusy}
            />

            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => router.replace("/login")}
              disabled={isBusy}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
                paddingVertical: 6,
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              <Ionicons name="arrow-back-outline" size={18} color={theme.accent} />
              <Text style={{ color: theme.accent, fontWeight: "900" }}>
                Voltar ao login
              </Text>
            </Pressable>
          </Card>
        </View>
      </KeyboardScreen>
    </AppShell>
  );
}