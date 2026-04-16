// app/(drawer)/todo/[id].tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../src/auth/AuthProvider";
import {
  deleteTodo,
  listTodosPaged,
  Todo,
  updateTodo,
} from "../../../src/api/todos";
import { theme } from "../../../src/ui/theme";
import {
  Card,
  Muted,
  PrimaryButton,
  Screen,
  Title,
} from "../../../src/ui/components";
import { formatDateSafe } from "../../../src/utils/format";
import { confirmAction } from "../../../src/ui/confirm";

export default function TodoByIdModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isBootstrapping, isBusy, setBusy } = useAuth();

  const [todo, setTodo] = useState<Todo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // evita race conditions e setState após unmount / troca de id
  const loadSeq = useRef(0);

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  async function loadById(todoId: string) {
    // varre páginas até achar
    const TAKE = 20;
    const MAX_PAGES = 25; // segurança (20*25 = 500 itens)
    let cursor: string | null = null;

    // guard extra: evita cursor repetido em caso de backend bug
    const seenCursors = new Set<string>();

    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await listTodosPaged({ take: TAKE, cursor });
      const items = r.items || [];

      const found = items.find((t) => t.id === todoId) || null;
      if (found) return found;

      const next = r.nextCursor || null;
      if (!next) break;

      // evita loop se cursor repetir
      if (seenCursors.has(next)) break;
      seenCursors.add(next);

      cursor = next;
    }

    return null;
  }

  useEffect(() => {
    const todoId = String(id || "").trim();
    if (!todoId) {
      setTodo(null);
      setTitle("");
      setDesc("");
      setLoadError("ID inválido.");
      return;
    }

    const seq = ++loadSeq.current;
    let alive = true;

    (async () => {
      try {
        setLoadError(null);
        setTodo(null);
        setTitle("");
        setDesc("");

        setBusy(true, "Carregando tarefa…");
        const found = await loadById(todoId);

        // se mudou o id ou desmontou, ignora
        if (!alive || seq !== loadSeq.current) return;

        setTodo(found);
        setTitle(found?.title || "");
        setDesc(found?.description || "");

        if (!found) {
          setLoadError("Tarefa não encontrada (pode estar fora das páginas varridas).");
        }
      } catch (e: any) {
        if (!alive || seq !== loadSeq.current) return;
        setLoadError(e?.message || "Não foi possível carregar.");
      } finally {
        if (alive && seq === loadSeq.current) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSave = useMemo(() => title.trim().length > 0 && !isBusy, [title, isBusy]);

  async function onSave() {
    if (!todo || isBusy) return;

    try {
      setBusy(true, "Salvando…");
      const r = await updateTodo(todo.id, {
        title: title.trim(),
        description: desc.trim() || null,
      });

      // atualiza estado local (se quiser ficar na tela, já está atualizado)
      setTodo(r.todo);
      router.back();
    } catch (e: any) {
      Alert.alert("Falha ao salvar", e?.message || "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleDone() {
    if (!todo || isBusy) return;

    try {
      setBusy(true, "Atualizando…");
      const r = await updateTodo(todo.id, { done: !todo.done });
      setTodo(r.todo);

      // mantém campos de edição coerentes (se o backend alterar algo)
      setTitle((prev) => (prev.trim() ? prev : r.todo.title));
      setDesc((prev) => (prev !== undefined ? prev : r.todo.description || ""));
    } catch (e: any) {
      Alert.alert("Falha", e?.message || "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!todo || isBusy) return;

    const ok = await confirmAction({
      title: "Excluir tarefa",
      message: "Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      destructive: true,
    });

    if (!ok) return;

    try {
      setBusy(true, "Excluindo…");
      await deleteTodo(todo.id);
      router.back();
    } catch (e: any) {
      Alert.alert("Falha", e?.message || "Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.28)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderWidth: 1,
            borderColor: theme.line,
            padding: 16,
            maxHeight: "90%",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
          >
            <Title>Editar tarefa</Title>

            {loadError ? (
              <Card>
                <Text style={{ color: theme.danger, fontWeight: "900", fontSize: 16 }}>
                  Falha
                </Text>
                <View style={{ height: 6 }} />
                <Text style={{ color: theme.muted, fontWeight: "600", lineHeight: 22 }}>
                  {loadError}
                </Text>
                <View style={{ height: 10 }} />
                <PrimaryButton
                  label="Fechar"
                  onPress={() => router.back()}
                  variant="ghost"
                  disabled={isBusy}
                />
              </Card>
            ) : null}

            {!loadError && !todo ? (
              <Card>
                <Muted>Carregando…</Muted>
              </Card>
            ) : null}

            {todo ? (
              <>
                <Card>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Título"
                    placeholderTextColor={theme.muted}
                    editable={!isBusy}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.line,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: theme.text,
                      backgroundColor: theme.card2,
                      fontSize: theme.font.body,
                      fontWeight: "700",
                      opacity: isBusy ? 0.85 : 1,
                    }}
                  />

                  <View style={{ height: 10 }} />

                  <TextInput
                    value={desc}
                    onChangeText={setDesc}
                    placeholder="Descrição (opcional)"
                    placeholderTextColor={theme.muted}
                    editable={!isBusy}
                    multiline
                    style={{
                      borderWidth: 1,
                      borderColor: theme.line,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: theme.text,
                      backgroundColor: theme.card2,
                      minHeight: 110,
                      textAlignVertical: "top",
                      fontSize: theme.font.body,
                      fontWeight: "600",
                      lineHeight: 22,
                      opacity: isBusy ? 0.85 : 1,
                    }}
                  />

                  <View style={{ height: 10 }} />

                  <Muted>
                    {todo.done ? "✅ Concluída" : "🟣 Pendente"} • Atualizado:{" "}
                    {formatDateSafe(todo.updatedAt)}
                  </Muted>
                </Card>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={todo.done ? "Reabrir" : "Concluir"}
                      onPress={onToggleDone}
                      variant="ghost"
                      disabled={isBusy}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Salvar"
                      onPress={onSave}
                      disabled={!canSave}
                      loading={isBusy}
                    />
                  </View>
                </View>

                <PrimaryButton
                  label="Excluir"
                  onPress={onDelete}
                  variant="danger"
                  disabled={isBusy}
                />
                <PrimaryButton
                  label="Fechar"
                  onPress={() => router.back()}
                  variant="ghost"
                  disabled={isBusy}
                />
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Screen>
  );
}