// app/(drawer)/_todos.ui.tsx
import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { theme } from "../../src/ui/theme";
import {
  Card,
  DrawerMenuButton,
  Muted,
  Pill,
  PremiumHeader,
  PrimaryButton,
  Screen,
  Title,
} from "../../src/ui/components";
import { formatDateSafe } from "../../src/utils/format";

import type { TodosLogic } from "./_todos.logic";

export function TodosUI(props: { logic: TodosLogic; isBusy: boolean }) {
  const { logic, isBusy } = props;

  const {
    items,
    refreshing,
    isLoadingFirstPage,
    loadingMore,
    hasMore,
    loadError,

    filter,
    setFilter,
    q,
    setQ,
    debouncedQ,

    totalText,
    disableBulk,
    busyBulkDelete,

    detailsOpen,
    modalOpen,
    selected,
    editing,

    formTitle,
    setFormTitle,
    formDesc,
    setFormDesc,

    reminderLabel,
    remDate,
    setRemDate,
    remTime,
    setRemTime,
    remMode,
    setRemMode,
    remEveryText,
    setRemEveryText,
    remUnit,
    setRemUnit,

    listRef,
    swipes,

    subtitle,
    showEmpty,

    openCreate,
    openEdit,
    openDetails,
    closeDetails,

    // ✅ NECESSÁRIO: fecha o modal de criar/editar
    closeForm,

    loadFirstPage,
    loadMore,
    onRefresh,

    saveForm,
    toggleDone,
    remove,
    removeAll,

    remindSelected,
    remindSelectedAtDateTime,
    remindSelectedRepeat,
    cancelSelectedReminder,
  } = logic;

  const isAnyModalOpen = detailsOpen || modalOpen;

  return (
    <Screen padded={false} style={{ paddingTop: 12 }}>
      <View style={{ flex: 1, width: "100%" }}>
        <View style={{ paddingHorizontal: 16 }}>
          <PremiumHeader
            title="To-Dos"
            subtitle={subtitle}
            left={
              <View style={{ marginRight: 10 }}>
                <DrawerMenuButton />
              </View>
            }
            right={
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={{ minWidth: 120 }}>
                  <PrimaryButton
                    label="+ Nova"
                    onPress={openCreate}
                    disabled={isBusy}
                    fullWidth={false}
                  />
                </View>

                {/* OCULTADO: Excluir tudo (como no original) */}
                {false ? (
                  <View style={{ minWidth: 160 }}>
                    <PrimaryButton
                      label={busyBulkDelete ? "Excluindo…" : "Excluir tudo"}
                      onPress={removeAll}
                      disabled={disableBulk}
                      variant="ghost"
                      fullWidth={false}
                    />
                  </View>
                ) : null}
              </View>
            }
          />
        </View>

        <View style={{ flex: 1, width: "100%", paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ color: theme.muted, fontWeight: "800", marginBottom: 8 }}>
            {totalText}
          </Text>

          <Card style={{ marginBottom: 12 }}>
            <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16 }}>
              Pesquisar
            </Text>

            <View style={{ height: 10 }} />

            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Busque por título ou descrição…"
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
                opacity: isBusy ? 0.85 : 1,
                fontSize: theme.font.body,
                fontWeight: "600",
              }}
            />

            <View style={{ height: 12 }} />

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Pill label="Todas" active={filter === "all"} onPress={() => setFilter("all")} />
              <Pill
                label="Pendentes"
                active={filter === "open"}
                onPress={() => setFilter("open")}
              />
              <Pill
                label="Concluídas"
                active={filter === "done"}
                onPress={() => setFilter("done")}
              />
            </View>
          </Card>

          {loadError ? (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ color: theme.danger, fontWeight: "900", fontSize: 16 }}>
                Falha
              </Text>
              <View style={{ height: 6 }} />
              <Text style={{ color: theme.muted, fontWeight: "600", lineHeight: 22 }}>
                {loadError}
              </Text>
              <View style={{ height: 12 }} />
              <PrimaryButton
                label="Tentar novamente"
                onPress={() => loadFirstPage(true)}
                disabled={isBusy}
              />
            </Card>
          ) : null}

          <FlatList
            ref={listRef}
            style={{ flex: 1, width: "100%" }}
            data={items}
            keyExtractor={(t) => t.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 28, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            onEndReachedThreshold={0.35}
            onEndReached={isAnyModalOpen ? undefined : loadMore}
            ListFooterComponent={
              <View style={{ paddingVertical: 14 }}>
                {isLoadingFirstPage ? (
                  <Text style={{ textAlign: "center", color: theme.muted, fontWeight: "800" }}>
                    Carregando…
                  </Text>
                ) : loadingMore ? (
                  <Text style={{ textAlign: "center", color: theme.muted, fontWeight: "800" }}>
                    Carregando mais…
                  </Text>
                ) : hasMore ? (
                  <Text style={{ textAlign: "center", color: theme.muted, fontWeight: "700" }}>
                    Role para carregar mais
                  </Text>
                ) : (
                  <Text style={{ textAlign: "center", color: theme.muted, fontWeight: "700" }}>
                    Fim da lista
                  </Text>
                )}
              </View>
            }
            ListEmptyComponent={
              showEmpty ? (
                <Card style={{ marginBottom: 0 }}>
                  <Title>Nenhuma tarefa</Title>
                  <View style={{ height: 6 }} />
                  <Muted>
                    {debouncedQ || filter !== "all"
                      ? "Nenhum resultado para os filtros atuais."
                      : "Toque em “+ Nova” para criar sua primeira tarefa."}
                  </Muted>
                </Card>
              ) : (
                <Card style={{ marginBottom: 0 }}>
                  <Title>Carregando…</Title>
                  <View style={{ height: 6 }} />
                  <Muted>Buscando suas tarefas no servidor.</Muted>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <Swipeable
                ref={(ref) => {
                  if (ref) swipes.set(item.id, ref);
                }}
                leftThreshold={60}
                rightThreshold={60}
                renderLeftActions={() => (
                  <View
                    style={{
                      width: 110,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#DCFCE7",
                      borderRadius: theme.radius.lg,
                      marginRight: 10,
                      borderWidth: 1,
                      borderColor: theme.line,
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: theme.good, fontSize: 14 }}>
                      {item.done ? "Reabrir" : "Concluir"}
                    </Text>
                  </View>
                )}
                renderRightActions={() => (
                  <View
                    style={{
                      width: 110,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#FEE2E2",
                      borderRadius: theme.radius.lg,
                      marginLeft: 10,
                      borderWidth: 1,
                      borderColor: theme.line,
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: theme.danger, fontSize: 14 }}>
                      Excluir
                    </Text>
                  </View>
                )}
                onSwipeableLeftOpen={() => toggleDone(item)}
                onSwipeableRightOpen={() => remove(item)}
              >
                <Pressable onPress={() => openDetails(item)} disabled={isBusy}>
                  <Card style={{ marginBottom: 0 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "900",
                          fontSize: 17,
                          flex: 1,
                          textDecorationLine: item.done ? "line-through" : "none",
                          opacity: item.done ? 0.7 : 1,
                        }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>

                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "900" }}>
                          {item.done ? "Concluída" : "Pendente"}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>
                          {formatDateSafe(item.updatedAt)}
                        </Text>
                      </View>
                    </View>

                    {item.description ? (
                      <>
                        <View style={{ height: 8 }} />
                        <Text
                          style={{
                            color: theme.muted,
                            fontSize: theme.font.body,
                            lineHeight: 22,
                            fontWeight: "600",
                          }}
                          numberOfLines={3}
                        >
                          {item.description}
                        </Text>
                      </>
                    ) : null}
                  </Card>
                </Pressable>
              </Swipeable>
            )}
          />
        </View>

        {/* MODAL: DETALHES */}
        <Modal visible={detailsOpen} animationType="slide" transparent onRequestClose={closeDetails}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.28)",
              justifyContent: "flex-start",
              paddingTop: 60,
              paddingHorizontal: 12,
            }}
          >
            <View
              style={{
                backgroundColor: theme.bg,
                borderRadius: 22,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: theme.line,
                padding: 16,
                maxHeight: "85%",
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              >
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>
                  Detalhes da tarefa
                </Text>

                {selected ? (
                  <Card style={{ marginBottom: 0 }}>
                    <Text style={{ color: theme.text, fontWeight: "900", fontSize: 18 }}>
                      {selected.title}
                    </Text>

                    {selected.description ? (
                      <>
                        <View style={{ height: 8 }} />
                        <Text
                          style={{
                            color: theme.muted,
                            fontSize: theme.font.body,
                            lineHeight: 22,
                            fontWeight: "600",
                          }}
                        >
                          {selected.description}
                        </Text>
                      </>
                    ) : null}

                    <View style={{ height: 12 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "800" }}>
                        {selected.done ? "✅ Concluída" : "🟣 Pendente"}
                      </Text>
                      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>
                        {formatDateSafe(selected.updatedAt)}
                      </Text>
                    </View>
                  </Card>
                ) : (
                  <Card style={{ marginBottom: 0 }}>
                    <Muted>Carregando…</Muted>
                  </Card>
                )}

                {/* 🔔 Lembretes */}
                <Card style={{ marginBottom: 0 }}>
                  <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16 }}>
                    Lembrete
                  </Text>
                  <View style={{ height: 8 }} />

                  <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 12 }}>
                    {reminderLabel}
                  </Text>

                  <View style={{ height: 12 }} />

                  {/* presets (uma vez) */}
                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <View style={{ minWidth: 140 }}>
                      <PrimaryButton
                        label="🔔 Em 10 min"
                        onPress={() => remindSelected(10)}
                        disabled={!selected || isBusy}
                        variant="ghost"
                        fullWidth={false}
                      />
                    </View>
                    <View style={{ minWidth: 140 }}>
                      <PrimaryButton
                        label="🔔 Em 60 min"
                        onPress={() => remindSelected(60)}
                        disabled={!selected || isBusy}
                        variant="ghost"
                        fullWidth={false}
                      />
                    </View>
                  </View>

                  <View style={{ height: 14 }} />

                  <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 12 }}>
                    Tipo de lembrete
                  </Text>
                  <View style={{ height: 8 }} />

                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Pill
                      label="Único (data/hora)"
                      active={remMode === "once"}
                      onPress={() => setRemMode("once")}
                    />
                    <Pill
                      label="Recorrente (a cada X)"
                      active={remMode === "repeat"}
                      onPress={() => setRemMode("repeat")}
                    />
                  </View>

                  <View style={{ height: 12 }} />

                  {remMode === "once" ? (
                    <>
                      <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 12 }}>
                        Agendar por data/hora (local)
                      </Text>
                      <View style={{ height: 8 }} />

                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            value={remDate}
                            onChangeText={setRemDate}
                            placeholder="YYYY-MM-DD"
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
                              opacity: isBusy ? 0.85 : 1,
                              fontSize: theme.font.body,
                              fontWeight: "700",
                            }}
                          />
                        </View>
                        <View style={{ width: 110 }}>
                          <TextInput
                            value={remTime}
                            onChangeText={setRemTime}
                            placeholder="HH:MM"
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
                              opacity: isBusy ? 0.85 : 1,
                              fontSize: theme.font.body,
                              fontWeight: "700",
                              textAlign: "center",
                            }}
                          />
                        </View>
                      </View>

                      <View style={{ height: 10 }} />

                      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                        <View style={{ minWidth: 170 }}>
                          <PrimaryButton
                            label="Agendar"
                            onPress={remindSelectedAtDateTime}
                            disabled={!selected || isBusy}
                            fullWidth={false}
                          />
                        </View>
                        <View style={{ minWidth: 190 }}>
                          <PrimaryButton
                            label="Cancelar lembrete"
                            onPress={cancelSelectedReminder}
                            disabled={!selected || isBusy}
                            variant="danger"
                            fullWidth={false}
                          />
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 12 }}>
                        Recorrente: a cada X (min/horas/dias/semanas/meses)
                      </Text>
                      <View style={{ height: 8 }} />

                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ width: 110 }}>
                          <TextInput
                            value={remEveryText}
                            onChangeText={setRemEveryText}
                            placeholder="Ex: 2"
                            placeholderTextColor={theme.muted}
                            editable={!isBusy}
                            keyboardType="number-pad"
                            style={{
                              borderWidth: 1,
                              borderColor: theme.line,
                              borderRadius: theme.radius.md,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              color: theme.text,
                              backgroundColor: theme.card2,
                              opacity: isBusy ? 0.85 : 1,
                              fontSize: theme.font.body,
                              fontWeight: "800",
                              textAlign: "center",
                            }}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                            <Pill
                              label="Min"
                              active={remUnit === "minutes"}
                              onPress={() => setRemUnit("minutes")}
                            />
                            <Pill
                              label="Horas"
                              active={remUnit === "hours"}
                              onPress={() => setRemUnit("hours")}
                            />
                            <Pill
                              label="Dias"
                              active={remUnit === "days"}
                              onPress={() => setRemUnit("days")}
                            />
                            <Pill
                              label="Sem"
                              active={remUnit === "weeks"}
                              onPress={() => setRemUnit("weeks")}
                            />
                            <Pill
                              label="Meses"
                              active={remUnit === "months"}
                              onPress={() => setRemUnit("months")}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={{ height: 10 }} />

                      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                        <View style={{ minWidth: 170 }}>
                          <PrimaryButton
                            label="Ativar recorrência"
                            onPress={remindSelectedRepeat}
                            disabled={!selected || isBusy}
                            fullWidth={false}
                          />
                        </View>
                        <View style={{ minWidth: 190 }}>
                          <PrimaryButton
                            label="Cancelar lembrete"
                            onPress={cancelSelectedReminder}
                            disabled={!selected || isBusy}
                            variant="danger"
                            fullWidth={false}
                          />
                        </View>
                      </View>

                      {remUnit === "months" ? (
                        <Text
                          style={{
                            color: theme.muted,
                            fontWeight: "700",
                            fontSize: 12,
                            marginTop: 6,
                          }}
                        >
                          Obs.: “meses” é aproximado (30 dias). Depois, se quiser mensal exato,
                          fazemos via listener.
                        </Text>
                      ) : null}
                    </>
                  )}
                </Card>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={selected?.done ? "Reabrir" : "Concluir"}
                      onPress={() => (selected ? toggleDone(selected) : undefined)}
                      disabled={!selected || isBusy}
                      variant="ghost"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Editar"
                      onPress={() => {
                        if (!selected) return;
                        closeDetails();
                        openEdit(selected);
                      }}
                      disabled={!selected || isBusy}
                    />
                  </View>
                </View>

                <PrimaryButton
                  label="Excluir"
                  onPress={() => (selected ? remove(selected) : undefined)}
                  disabled={!selected || isBusy}
                  variant="danger"
                />

                <PrimaryButton
                  label="Fechar"
                  onPress={closeDetails}
                  disabled={isBusy}
                  variant="ghost"
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL: CRIAR/EDITAR */}
        <Modal
          visible={modalOpen}
          animationType="slide"
          transparent
          // ✅ NECESSÁRIO: Android back fecha modal
          onRequestClose={closeForm}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.28)",
              justifyContent: "flex-start",
              paddingTop: 60,
              paddingHorizontal: 12,
            }}
          >
            <View
              style={{
                backgroundColor: theme.bg,
                borderRadius: 22,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: theme.line,
                padding: 16,
                maxHeight: "85%",
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              >
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>
                  {editing ? "Editar tarefa" : "Nova tarefa"}
                </Text>

                <TextInput
                  value={formTitle}
                  onChangeText={setFormTitle}
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
                    opacity: isBusy ? 0.85 : 1,
                    fontSize: theme.font.body,
                    fontWeight: "800",
                  }}
                />

                <TextInput
                  value={formDesc}
                  onChangeText={setFormDesc}
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
                    opacity: isBusy ? 0.85 : 1,
                    fontSize: theme.font.body,
                    fontWeight: "600",
                    lineHeight: 22,
                  }}
                />

                <PrimaryButton
                  label={editing ? "Salvar" : "Criar"}
                  onPress={saveForm}
                  disabled={!formTitle.trim() || isBusy}
                  loading={isBusy}
                />

                <PrimaryButton
                  label="Cancelar"
                  // ✅ NECESSÁRIO: fecha modal
                  onPress={closeForm}
                  disabled={isBusy}
                  variant="ghost"
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}