// app/(drawer)/profile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../src/auth/AuthProvider";
import { theme } from "../../src/ui/theme";
import {
  Card,
  DrawerMenuButton,
  Muted,
  PremiumHeader,
  PrimaryButton,
  Screen,
  SectionTitle,
  TextField,
  Title,
} from "../../src/ui/components";

import {
  patchMe,
  patchMeEmail,
  patchMePassword,
  deleteMe,
} from "../../src/api/account";
import { uploadImageMultipart } from "../../src/api/images";
import { setToken } from "../../src/storage/token";
import { KeyboardScreen } from "../../src/ui/KeyboardScreen";

function normalizeEmail(s: string) {
  return (s || "").trim().toLowerCase();
}
function isGoogleLocked(user: any) {
  return !!user?.googleSub;
}

// ✅ compat: funciona em versões antigas e novas do expo-image-picker
function getImageMediaTypePickerValue() {
  const anyPicker: any = ImagePicker as any;

  // novo (quando existir)
  if (anyPicker?.MediaType?.Image) {
    return [anyPicker.MediaType.Image];
  }

  // antigo (ainda existe em versões antigas)
  if (anyPicker?.MediaTypeOptions?.Images) {
    return anyPicker.MediaTypeOptions.Images;
  }

  // fallback extremo (evita quebrar)
  return undefined;
}

export default function ProfileScreen() {
  const { user, isBootstrapping, refreshMe, logout, setBusy, isBusy } = useAuth();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [deletePassword, setDeletePassword] = useState("");

  const googleLocked = useMemo(() => isGoogleLocked(user), [user]);

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  useEffect(() => {
    setName(user?.name || "");
    setNewEmail(user?.email || "");
    setEmailPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setDeletePassword("");
  }, [user?.id]);

  async function onRefresh() {
    setError(null);
    try {
      setRefreshing(true);
      await refreshMe();
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar.");
    } finally {
      setRefreshing(false);
    }
  }

  async function onSaveName() {
    const n = name.trim();
    if (!n) return Alert.alert("Nome inválido", "Digite um nome.");

    setError(null);
    try {
      setBusy(true, "Salvando nome…");
      await patchMe({ name: n });
      await refreshMe();
      Alert.alert("Pronto!", "Nome atualizado.");
    } catch (e: any) {
      setError(e?.message || "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickAndUploadPhoto() {
    // ✅ regra do produto: não permite trocar foto em conta Google
    if (googleLocked) return;

    setError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permissão negada",
          "Permita acesso à galeria para escolher uma imagem."
        );
        return;
      }

      const mediaTypes = getImageMediaTypePickerValue();

      const result = await ImagePicker.launchImageLibraryAsync({
        ...(mediaTypes ? { mediaTypes } : {}),
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      const uri = asset?.uri;
      if (!uri) return;

      setBusy(true, "Enviando foto…");

      const guessedExt =
        (asset.fileName &&
          asset.fileName.includes(".") &&
          asset.fileName.split(".").pop()) ||
        "jpg";

      const ext = String(guessedExt).toLowerCase();
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
      const filename = `profile_${Date.now()}.${
        ext === "png" || ext === "webp" ? ext : "jpg"
      }`;

      const up = await uploadImageMultipart({ uri, filename, mimeType });

      await patchMe({ picture: up.url });
      await refreshMe();

      Alert.alert("Pronto!", "Foto atualizada.");
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar a foto.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEmail() {
    // ✅ só conta local (UI não mostra em Google)
    if (googleLocked) return;

    const e = normalizeEmail(newEmail);
    if (!e.includes("@"))
      return Alert.alert("Email inválido", "Digite um e-mail válido.");
    if (!emailPassword) {
      return Alert.alert(
        "Senha obrigatória",
        "Digite sua senha atual para trocar o e-mail."
      );
    }

    setError(null);
    try {
      setBusy(true, "Atualizando e-mail…");
      const res = await patchMeEmail(e, emailPassword);
      await setToken(res.token);
      await refreshMe();
      setEmailPassword("");
      Alert.alert("Pronto!", "E-mail atualizado.");
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar o e-mail.");
    } finally {
      setBusy(false);
    }
  }

  async function onSavePassword() {
    // ✅ alinhado com backend novo: somente conta local pode alterar senha
    if (googleLocked) return;

    if (!currentPassword || newPassword.length < 6) {
      Alert.alert(
        "Dados inválidos",
        "Informe a senha atual e uma nova senha com 6+ caracteres."
      );
      return;
    }

    setError(null);
    try {
      setBusy(true, "Atualizando senha…");
      await patchMePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Pronto!", "Senha atualizada.");
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar a senha.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAccount() {
    const needsPassword = !googleLocked;

    if (needsPassword && !deletePassword) {
      Alert.alert("Senha obrigatória", "Digite sua senha para excluir sua conta.");
      return;
    }

    Alert.alert("Excluir conta", "Essa ação é permanente. Deseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setError(null);
          try {
            setBusy(true, "Excluindo conta…");
            await deleteMe(needsPassword ? deletePassword : undefined);
            await logout();
            router.replace("/login");
          } catch (e: any) {
            setError(e?.message || "Não foi possível excluir a conta.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen padded={false} style={{ paddingTop: 12 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <PremiumHeader
          title="Editar perfil"
          subtitle="Nome e segurança"
          left={<DrawerMenuButton />}
        />
      </View>

      {/* ✅ pull-to-refresh aqui */}
      <KeyboardScreen
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentStyle={{ paddingTop: 12, paddingBottom: 28, gap: 12 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <Card>
            <Title>Conta</Title>
            <View style={{ height: 10 }} />

            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 999,
                  overflow: "hidden",
                  backgroundColor: theme.card2,
                  borderWidth: 1,
                  borderColor: theme.line,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {user?.picture ? (
                  <Image source={{ uri: user.picture }} style={{ width: 66, height: 66 }} />
                ) : (
                  <Text style={{ fontWeight: "900", color: theme.muted }}>
                    {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Muted>Email</Muted>
                <Text
                  style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}
                  numberOfLines={1}
                >
                  {user?.email ?? "—"}
                </Text>

                <View style={{ height: 6 }} />
                <Muted>ID</Muted>
                <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>
                  {user?.id ?? "—"}
                </Text>

                {googleLocked ? (
                  <>
                    <View style={{ height: 8 }} />
                    <Muted style={{ fontSize: 14 }}>
                      Conta Google: foto e e-mail são gerenciados pelo Google. (Arraste para baixo para atualizar)
                    </Muted>
                  </>
                ) : (
                  <>
                    <View style={{ height: 8 }} />
                    <Muted style={{ fontSize: 14 }}>Arraste para baixo para atualizar.</Muted>
                  </>
                )}
              </View>
            </View>

            {/* ✅ Foto só para conta local */}
            {!googleLocked ? (
              <>
                <View style={{ height: 12 }} />
                <PrimaryButton
                  label="Trocar foto"
                  onPress={onPickAndUploadPhoto}
                  disabled={isBusy}
                  loading={isBusy}
                />
              </>
            ) : null}
          </Card>

          {error ? (
            <Card>
              <Text style={{ color: theme.danger, fontWeight: "900", fontSize: 16 }}>
                Falha
              </Text>
              <View style={{ height: 6 }} />
              <Text style={{ color: theme.muted, fontWeight: "600", lineHeight: 22 }}>
                {error}
              </Text>
            </Card>
          ) : null}

          <Card>
            <SectionTitle>Nome</SectionTitle>
            <View style={{ height: 10 }} />
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              editable={!isBusy}
              returnKeyType="done"
            />
            <View style={{ height: 12 }} />
            <PrimaryButton
              label="Salvar nome"
              onPress={onSaveName}
              disabled={isBusy || !name.trim()}
            />
          </Card>

          {/* ✅ Alterar e-mail só conta local */}
          {!googleLocked ? (
            <Card>
              <SectionTitle>Alterar e-mail</SectionTitle>
              <View style={{ height: 8 }} />
              <Muted style={{ fontSize: 14 }}>
                Somente conta local. O backend retorna um token novo após trocar o e-mail.
              </Muted>

              <View style={{ height: 10 }} />

              <TextField
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Novo e-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isBusy}
                returnKeyType="next"
              />

              <View style={{ height: 10 }} />

              <TextField
                value={emailPassword}
                onChangeText={setEmailPassword}
                placeholder="Senha atual"
                secureTextEntry
                editable={!isBusy}
                returnKeyType="done"
              />

              <View style={{ height: 12 }} />

              <PrimaryButton
                label="Salvar e-mail"
                onPress={onSaveEmail}
                disabled={
                  isBusy || !normalizeEmail(newEmail).includes("@") || !emailPassword
                }
              />
            </Card>
          ) : null}

          {/* ✅ Alterar senha: somente conta local (alinhado com backend novo) */}
          {!googleLocked ? (
            <Card>
              <SectionTitle>Alterar senha do app</SectionTitle>
              <View style={{ height: 8 }} />
              <Muted style={{ fontSize: 14 }}>
                Essa é a senha da sua conta no app (conta local).
              </Muted>

              <View style={{ height: 10 }} />

              <TextField
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Senha atual"
                secureTextEntry
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
              />

              <View style={{ height: 12 }} />

              <PrimaryButton
                label="Salvar senha"
                onPress={onSavePassword}
                disabled={isBusy || !currentPassword || newPassword.length < 6}
              />
            </Card>
          ) : null}

          <Card>
            <SectionTitle style={{ color: theme.danger }}>Excluir conta</SectionTitle>
            <View style={{ height: 8 }} />
            <Muted style={{ fontSize: 14 }}>
              Essa ação é permanente. Suas tarefas e dados serão removidos.
            </Muted>

            {!googleLocked ? (
              <>
                <View style={{ height: 10 }} />
                <TextField
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Senha (obrigatória para conta local)"
                  secureTextEntry
                  editable={!isBusy}
                  returnKeyType="done"
                />
              </>
            ) : null}

            <View style={{ height: 12 }} />

            <PrimaryButton
              label="Excluir minha conta"
              variant="danger"
              onPress={onDeleteAccount}
              disabled={isBusy || (!googleLocked && !deletePassword)}
            />
          </Card>

          <PrimaryButton
            label="Sair"
            onPress={() => logout()}
            variant="danger"
            disabled={isBusy}
          />
        </View>
      </KeyboardScreen>
    </Screen>
  );
}