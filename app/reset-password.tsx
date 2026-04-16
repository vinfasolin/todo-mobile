// app/reset-password.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { resetPassword } from "../src/api/auth";
import { useAuth } from "../src/auth/AuthProvider";

function normalizeEmail(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const { isBusy, setBusy } = useAuth();

  const initialEmail = useMemo(
    () => normalizeEmail(String(params.email || "")),
    [params.email]
  );

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function onReset() {
    const e = normalizeEmail(email);
    if (!e.includes("@"))
      return Alert.alert("Email inválido", "Digite um e-mail válido.");
    if (code.trim().length < 4)
      return Alert.alert(
        "Código inválido",
        "Digite o código recebido por e-mail."
      );
    if (newPassword.length < 6)
      return Alert.alert(
        "Senha fraca",
        "A senha deve ter no mínimo 6 caracteres."
      );

    try {
      setBusy(true, "Redefinindo sua senha…");
      await resetPassword(e, code.trim(), newPassword);

      Alert.alert("Senha atualizada!", "Agora você pode entrar com a nova senha.", [
        { text: "Ir para login", onPress: () => router.replace("/login") },
      ]);
    } catch (err: any) {
      Alert.alert("Falha", err?.message || "Não foi possível redefinir a senha.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    normalizeEmail(email).includes("@") &&
    code.trim().length >= 4 &&
    newPassword.length >= 6 &&
    !isBusy;

  return (
    <AppShell>
      <KeyboardScreen>
        <View style={{ gap: 12 }}>
          <Title>Definir nova senha</Title>
          <Muted>Digite o e-mail, o código recebido e a nova senha.</Muted>

          <Card>
            <SectionTitle>Dados</SectionTitle>
            <View style={{ height: 10 }} />

            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isBusy}
              returnKeyType="next"
            />

            <View style={{ height: 10 }} />

            <TextField
              value={code}
              onChangeText={setCode}
              placeholder="Código"
              editable={!isBusy}
              returnKeyType="next"
            />

            <View style={{ height: 10 }} />

            <TextField
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nova senha (mín. 6)"
              secureTextEntry
              editable={!isBusy}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) onReset();
              }}
            />

            <View style={{ height: 12 }} />

            <PrimaryButton
              label={isBusy ? "Salvando…" : "Salvar nova senha"}
              onPress={onReset}
              disabled={!canSubmit}
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
              <Ionicons name="log-in-outline" size={18} color={theme.accent} />
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