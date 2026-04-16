// app/register.tsx
import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../src/auth/AuthProvider";
import { theme } from "../src/ui/theme";
import {
  AppShell, // ✅ para mostrar o BusyOverlay
  Card,
  PrimaryButton,
  Title,
  Muted,
  TextField,
  SectionTitle,
} from "../src/ui/components";
import { KeyboardScreen } from "../src/ui/KeyboardScreen";
import { normalizeEmail } from "../src/utils/format";

export default function Register() {
  const router = useRouter();
  const { user, isBootstrapping, registerWithPassword, isBusy, setBusy } =
    useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  useEffect(() => {
    if (!isBootstrapping && user) router.replace("/(drawer)");
  }, [user, isBootstrapping, router]);

  async function onRegister() {
    const e = normalizeEmail(email);
    const n = name.trim() || "Usuário";

    if (!e || pass.length < 6) {
      Alert.alert(
        "Dados inválidos",
        "Informe um email válido e senha com 6+ caracteres."
      );
      return;
    }

    try {
      setBusy(true, "Criando sua conta…");
      await registerWithPassword(n, e, pass);
      router.replace("/(drawer)");
    } catch (err: any) {
      Alert.alert(
        "Falha no cadastro",
        err?.message || "Não foi possível cadastrar."
      );
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !!normalizeEmail(email) && pass.length >= 6 && !isBusy;

  return (
    <AppShell>
      <KeyboardScreen>
        <View style={{ gap: 12 }}>
          <Title>Criar conta</Title>
          <Muted>
            Cadastro local (email/senha). Depois você pode usar o app normalmente.
          </Muted>

          <Card>
            <SectionTitle>Email e senha</SectionTitle>
            <View style={{ height: 10 }} />

            <TextField
              value={name}
              onChangeText={setName}
              placeholder="Nome (opcional)"
              editable={!isBusy}
              returnKeyType="next"
            />

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
              value={pass}
              onChangeText={setPass}
              placeholder="Senha (mín. 6)"
              secureTextEntry
              editable={!isBusy}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) onRegister();
              }}
            />

            <View style={{ height: 12 }} />

            <PrimaryButton
              label={isBusy ? "Criando…" : "Criar conta"}
              onPress={onRegister}
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
                Já tenho conta
              </Text>
            </Pressable>
          </Card>
        </View>
      </KeyboardScreen>
    </AppShell>
  );
}