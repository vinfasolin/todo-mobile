import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { createTodo, deleteTodo, listTodos, Todo, updateTodo } from "../../src/api/todos";
import { useAuth } from "../../src/auth/AuthProvider";
import { Card, Muted, Pill, PremiumHeader, PrimaryButton, Screen, Title } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";

type Filter = "all" | "open" | "done";

const DBG = true;
function dbg(...args: any[]) {
  if (!DBG) return;
  // eslint-disable-next-line no-console
  console.log("[TODOS]", ...args);
}
function short(v?: string | null, n = 10) {
  if (!v) return "";
  if (v.length <= n) return v;
  return `${v.slice(0, n)}…(${v.length})`;
}

export default function TodosScreen() {
  const { user, isBootstrapping } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<Todo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const [busyBulkDelete, setBusyBulkDelete] = useState(false);

  const swipes = useRef(new Map<string, Swipeable>()).current;
  const loadSeq = useRef(0);

  useEffect(() => {
    dbg("mount", { platform: Platform.OS, isBootstrapping, hasUser: !!user });
  }, []);

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  async function load() {
    const seq = ++loadSeq.current;
    dbg("load start seq:", seq);
    const res = await listTodos();
    dbg("load ok seq:", seq, "items:", res.items?.length);

    if (seq !== loadSeq.current) return;

    setItems(res.items.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)));
  }

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;

      (async () => {
        try {
          await load();
        } catch (e) {
          dbg("load error:", e);
        }
      })();

      return () => {
        swipes.forEach((s) => s?.close?.());
      };
    }, [user])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((x) => x.done).length;
    return { total, done, open: total - done };
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((t) => {
      if (filter === "open" && t.done) return false;
      if (filter === "done" && !t.done) return false;
      if (!term) return true;
      const hay = `${t.title} ${t.description || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, filter, q]);

  function openCreate() {
    setEditing(null);
    setFormTitle("");
    setFormDesc("");
    setModalOpen(true);
  }

  function openEdit(todo: Todo) {
    setEditing(todo);
    setFormTitle(todo.title);
    setFormDesc(todo.description || "");
    setModalOpen(true);
  }

  async function saveForm() {
    const title = formTitle.trim();
    const description = formDesc.trim() || null;
    if (!title) return;

    try {
      if (!editing) await createTodo({ title, description });
      else await updateTodo(editing.id, { title, description });

      setModalOpen(false);
      await load();
    } catch (e) {
      dbg("saveForm error:", e);
    }
  }

  async function toggleDone(todo: Todo) {
    try {
      swipes.get(todo.id)?.close?.();
      await updateTodo(todo.id, { done: !todo.done });
      await load();
    } catch (e) {
      dbg("toggle error:", e);
    }
  }

  async function remove(todo: Todo) {
    try {
      swipes.get(todo.id)?.close?.();
      await deleteTodo(todo.id);
      await load();
    } catch (e) {
      dbg("delete error:", e);
    }
  }

  function confirmDeleteAll(): Promise<boolean> {
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" ? window.confirm("Excluir TODAS as tarefas? Essa ação não pode ser desfeita.") : false;
      return Promise.resolve(ok);
    }

    return new Promise((resolve) => {
      Alert.alert(
        "Excluir todas",
        "Excluir TODAS as tarefas? Essa ação não pode ser desfeita.",
        [
          { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
          { text: "Excluir", style: "destructive", onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    });
  }

  async function removeAll() {
    if (!items.length || busyBulkDelete) return;

    const ok = await confirmDeleteAll();
    if (!ok) return;

    setBusyBulkDelete(true);
    try {
      swipes.forEach((s) => s?.close?.());
      for (const t of items) await deleteTodo(t.id);
      setItems([]);
      await load();
    } catch (e) {
      dbg("removeAll error:", e);
      await load();
    } finally {
      setBusyBulkDelete(false);
    }
  }

  return (
    <Screen>
      <PremiumHeader
        title="To-Dos"
        subtitle={`Pendentes ${stats.open} • Concluídas ${stats.done} • Total ${stats.total}`}
        right={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={openCreate}
              style={{
                backgroundColor: theme.accent,
                borderRadius: 999,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>+ Nova</Text>
            </Pressable>

            <Pressable
              onPress={removeAll}
              disabled={!items.length || busyBulkDelete}
              style={{
                borderWidth: 1,
                borderColor: theme.line,
                borderRadius: 999,
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: "rgba(255,77,109,0.12)",
                opacity: !items.length || busyBulkDelete ? 0.5 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              {busyBulkDelete ? <ActivityIndicator /> : <Text style={{ color: theme.text, fontWeight: "900" }}>Excluir todas</Text>}
            </Pressable>
          </View>
        }
      />

      {/* ✅ Debug Auth Panel */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Card>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Debug Auth</Text>
          <View style={{ height: 6 }} />
          <Text style={{ color: theme.muted, fontSize: 12 }}>platform: {Platform.OS}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>bootstrapping: {String(isBootstrapping)}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>hasUser: {String(!!user)}</Text>
          {user ? (
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              user: {user.name || user.email || user.id} • id={short(user.id, 10)}
            </Text>
          ) : (
            <Text style={{ color: theme.muted, fontSize: 12 }}>user: (null)</Text>
          )}
        </Card>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {/* resto do seu layout continua igual */}
        <Card>
          <Text style={{ color: theme.text, fontWeight: "800" }}>Pesquisar</Text>
          <View style={{ height: 10 }} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Busque por título ou descrição…"
            placeholderTextColor="rgba(234,240,255,0.45)"
            style={{
              borderWidth: 1,
              borderColor: theme.line,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.text,
              backgroundColor: theme.card2,
            }}
          />
          <View style={{ height: 12 }} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pill label="Todas" active={filter === "all"} onPress={() => setFilter("all")} />
            <Pill label="Pendentes" active={filter === "open"} onPress={() => setFilter("open")} />
            <Pill label="Concluídas" active={filter === "done"} onPress={() => setFilter("done")} />
          </View>
        </Card>

        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ gap: 10, paddingBottom: 26 }}
          ListEmptyComponent={
            <Card>
              <Title>Nada por aqui</Title>
              <View style={{ height: 6 }} />
              <Muted>Crie uma tarefa com “+ Nova” ou limpe a busca/filtros.</Muted>
            </Card>
          }
          renderItem={({ item }) => (
            <Swipeable
              ref={(ref) => {
                if (ref) swipes.set(item.id, ref);
              }}
              renderLeftActions={() => (
                <View
                  style={{
                    width: 110,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.good,
                    borderRadius: 16,
                    marginRight: 10,
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>{item.done ? "Reabrir" : "Concluir"}</Text>
                </View>
              )}
              renderRightActions={() => (
                <View
                  style={{
                    width: 110,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.danger,
                    borderRadius: 16,
                    marginLeft: 10,
                  }}
                >
                  <Text style={{ fontWeight: "900", color: "#fff" }}>Excluir</Text>
                </View>
              )}
              onSwipeableLeftOpen={() => toggleDone(item)}
              onSwipeableRightOpen={() => remove(item)}
            >
              <Pressable onPress={() => openEdit(item)}>
                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: "900",
                        flex: 1,
                        textDecorationLine: item.done ? "line-through" : "none",
                        opacity: item.done ? 0.7 : 1,
                      }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    <Pressable
                      onPress={() => router.push(`/todo/${item.id}`)}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.line,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: theme.text, fontWeight: "900" }}>Abrir</Text>
                    </Pressable>
                  </View>

                  {item.description ? (
                    <>
                      <View style={{ height: 6 }} />
                      <Text style={{ color: theme.muted }} numberOfLines={3}>
                        {item.description}
                      </Text>
                    </>
                  ) : null}

                  <View style={{ height: 10 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>{item.done ? "✅ Concluída" : "🟣 Pendente"}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>{new Date(item.updatedAt).toLocaleString()}</Text>
                  </View>
                </Card>
              </Pressable>
            </Swipeable>
          )}
        />

        <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: theme.bg,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                borderWidth: 1,
                borderColor: theme.line,
                padding: 16,
                gap: 10,
                maxHeight: "85%",
              }}
            >
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>
                {editing ? "Editar tarefa" : "Nova tarefa"}
              </Text>

              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Título"
                placeholderTextColor="rgba(234,240,255,0.45)"
                style={{
                  borderWidth: 1,
                  borderColor: theme.line,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.text,
                  backgroundColor: theme.card2,
                }}
              />

              <TextInput
                value={formDesc}
                onChangeText={setFormDesc}
                placeholder="Descrição (opcional)"
                placeholderTextColor="rgba(234,240,255,0.45)"
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: theme.line,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.text,
                  backgroundColor: theme.card2,
                  minHeight: 90,
                  textAlignVertical: "top",
                }}
              />

              <PrimaryButton label={editing ? "Salvar" : "Criar"} onPress={saveForm} disabled={!formTitle.trim()} />

              <Pressable
                onPress={() => setModalOpen(false)}
                style={{
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.line,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "900", textAlign: "center" }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
