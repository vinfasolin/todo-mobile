import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteTodo, listTodos, updateTodo } from "../../src/api/todos";
import { Card, PremiumHeader, PrimaryButton, Screen } from "../../src/ui/components";
import { theme } from "../../src/ui/theme";

export default function TodoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id || loaded) return;
      const res = await listTodos();
      const todo = res.items.find((x) => x.id === id);
      if (todo) {
        setTitle(todo.title);
        setDescription(todo.description || "");
        setDone(todo.done);
        setLoaded(true);
      }
    })();
  }, [id, loaded]);

  async function save() {
    if (!id) return;
    await updateTodo(String(id), {
      title: title.trim(),
      description: description.trim() || null,
      done,
    });
    router.back();
  }

  async function remove() {
    if (!id) return;
    await deleteTodo(String(id));
    router.back();
  }

  return (
    <Screen>
      <PremiumHeader title="Detalhe" subtitle="Edite sua tarefa" />
      <View style={{ padding: 16, gap: 12 }}>
        <Card>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Título</Text>
          <View style={{ height: 8 }} />
          <TextInput
            value={title}
            onChangeText={setTitle}
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

          <View style={{ height: 12 }} />
          <Text style={{ color: theme.text, fontWeight: "900" }}>Descrição</Text>
          <View style={{ height: 8 }} />
          <TextInput
            value={description}
            onChangeText={setDescription}
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
              minHeight: 120,
              textAlignVertical: "top",
            }}
          />

          <View style={{ height: 12 }} />
          <Pressable
            onPress={() => setDone((v) => !v)}
            style={{
              borderWidth: 1,
              borderColor: theme.line,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 12,
              backgroundColor: done ? "rgba(42,232,167,0.15)" : "transparent",
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>
              {done ? "✅ Concluída (toque para reabrir)" : "🟣 Pendente (toque para concluir)"}
            </Text>
          </Pressable>
        </Card>

        <PrimaryButton label="Salvar" onPress={save} disabled={!title.trim()} />

        <Pressable
          onPress={remove}
          style={{
            backgroundColor: theme.danger,
            borderRadius: 14,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
            Excluir
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={{
            borderWidth: 1,
            borderColor: theme.line,
            borderRadius: 14,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "900", textAlign: "center" }}>
            Voltar
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
