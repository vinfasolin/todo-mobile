// app/(drawer)/_todos.logic.ts
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

import {
  createTodo,
  deleteTodo,
  deleteTodosAll,
  deleteTodosBulk,
  listTodosServer,
  Todo,
  updateTodo,
} from "../../src/api/todos";

import { confirmAction } from "../../src/ui/confirm";

import {
  cancelReminder,
  formatReminderLabel,
  getReminderInfo,
  parseLocalDateTime,
  safeIntFromText,
  scheduleReminderAt,
  scheduleReminderEvery,
  scheduleReminderInMinutes,
  two,
  type RepeatUnit,
  type ReminderInfo,
  type ReminderMode,
} from "./_reminders.local";

export type Filter = "all" | "open" | "done";

export type TodosLogic = {
  // list
  items: Todo[];
  refreshing: boolean;
  isLoadingFirstPage: boolean;
  loadingMore: boolean;
  hasMore: boolean;

  // query/filter
  filter: Filter;
  setFilter: (v: Filter) => void;
  q: string;
  setQ: (v: string) => void;
  debouncedQ: string;
  isFiltered: boolean;

  // totals
  serverTotalAll: number | null;
  serverTotalFiltered: number | null;
  totalText: string;

  // errors
  loadError: string | null;

  // modals + selection
  detailsOpen: boolean;
  modalOpen: boolean;
  selected: Todo | null;
  editing: Todo | null;

  // form
  formTitle: string;
  setFormTitle: (v: string) => void;
  formDesc: string;
  setFormDesc: (v: string) => void;

  // reminder UI state
  selectedReminder: ReminderInfo | null;
  reminderLabel: string;

  remDate: string;
  setRemDate: (v: string) => void;
  remTime: string;
  setRemTime: (v: string) => void;

  remMode: ReminderMode;
  setRemMode: (v: ReminderMode) => void;

  remEveryText: string;
  setRemEveryText: (v: string) => void;

  remUnit: RepeatUnit;
  setRemUnit: (v: RepeatUnit) => void;

  // refs for UI
  listRef: React.RefObject<FlatList<Todo> | null>;
  swipes: Map<string, Swipeable>;

  // actions
  loadFirstPage: (showBusy?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  onRefresh: () => Promise<void>;

  openCreate: () => void;
  openEdit: (todo: Todo) => void;

  openDetails: (todo: Todo) => Promise<void>;
  closeDetails: () => void;

  // fecha modal de criar/editar
  closeForm: () => void;

  saveForm: () => Promise<void>;
  toggleDone: (todo: Todo) => Promise<void>;
  remove: (todo: Todo) => Promise<void>;
  removeAll: () => Promise<void>;

  // reminder actions
  remindSelected: (minutes: number) => Promise<void>;
  remindSelectedAtDateTime: () => Promise<void>;
  remindSelectedRepeat: () => Promise<void>;
  cancelSelectedReminder: () => Promise<void>;

  // derived stats
  subtitle: string;
  showEmpty: boolean;

  // flags
  busyBulkDelete: boolean;
  disableBulk: boolean;
};

function hasActiveFilter(q: string, filter: Filter) {
  return q.trim().length > 0 || filter !== "all";
}

function mergeUnique(prev: Todo[], incoming: Todo[]) {
  const seen = new Set(prev.map((x) => x.id));
  const out = prev.slice();
  for (const t of incoming) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

function toBackendFilter(filter: Filter): "all" | "open" | "done" {
  return filter;
}

export function useTodosLogic(opts: {
  userId?: string | null;
  isBootstrapping: boolean;
  isBusy: boolean;
  setBusy: (busy: boolean, message?: string | undefined) => void;
  onRequireLogin?: () => void;
  pageSize?: number;
}): TodosLogic {
  const {
    userId,
    isBootstrapping,
    isBusy,
    setBusy,
    onRequireLogin,
    pageSize = 5,
  } = opts;

  const [items, setItems] = useState<Todo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // paginação
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Todo | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const [busyBulkDelete, setBusyBulkDelete] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // totals do servidor
  const [serverTotalAll, setServerTotalAll] = useState<number | null>(null);
  const [serverTotalFiltered, setServerTotalFiltered] = useState<number | null>(null);

  // lembretes
  const [remDate, setRemDate] = useState(""); // YYYY-MM-DD
  const [remTime, setRemTime] = useState(""); // HH:MM

  const [remMode, setRemMode] = useState<ReminderMode>("once");
  const [remEveryText, setRemEveryText] = useState("60");
  const [remUnit, setRemUnit] = useState<RepeatUnit>("minutes");

  const [selectedReminder, setSelectedReminder] = useState<ReminderInfo | null>(null);

  // refs/guards
  const swipes = useRef(new Map<string, Swipeable>()).current;
  const listRef = useRef<FlatList<Todo> | null>(null);

  const loadSeq = useRef(0);
  const didInitialLoad = useRef(false);
  const lastEndReachedAt = useRef(0);

  const [isLoadingFirstPage, setIsLoadingFirstPage] = useState(false);

  const isAnyModalOpen = detailsOpen || modalOpen;
  const isFiltered = hasActiveFilter(debouncedQ, filter);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  function closeAllSwipes() {
    swipes.forEach((s) => s?.close?.());
  }

  async function loadFirstPage(showBusy = false) {
    if (!userId) return;
    const seq = ++loadSeq.current;

    setIsLoadingFirstPage(true);
    if (showBusy) setBusy(true, "Carregando tarefas…");

    setLoadError(null);
    setLoadingMore(false);
    setNextCursor(null);
    setHasMore(true);

    try {
      const r = await listTodosServer({
        take: pageSize,
        cursor: null,
        filter: toBackendFilter(filter),
        q: debouncedQ,
      });

      if (seq !== loadSeq.current) return;

      const nextItems = (r.items || []) as Todo[];
      const nextCur = (r.nextCursor ?? null) as string | null;

      const backendHasMore = typeof r.hasMore === "boolean" ? r.hasMore : null;
      const inferredHasMore = backendHasMore ?? !!nextCur;

      setItems(nextItems);
      setNextCursor(nextCur);
      setHasMore(inferredHasMore);

      setServerTotalAll(typeof r.totalAll === "number" ? r.totalAll : null);
      setServerTotalFiltered(typeof r.totalFiltered === "number" ? r.totalFiltered : null);
    } catch (e: any) {
      if (seq !== loadSeq.current) return;

      setItems([]);
      setNextCursor(null);
      setHasMore(false);
      setLoadError(e?.message || "Não foi possível carregar suas tarefas.");

      setServerTotalAll(null);
      setServerTotalFiltered(null);
    } finally {
      if (showBusy) setBusy(false);
      if (seq === loadSeq.current) setIsLoadingFirstPage(false);
    }
  }

  async function loadMore() {
    if (!userId) return;
    if (isAnyModalOpen) return;
    if (!hasMore || loadingMore || isBusy || busyBulkDelete) return;
    if (!nextCursor) return;

    const now = Date.now();
    if (now - lastEndReachedAt.current < 800) return;
    lastEndReachedAt.current = now;

    setLoadingMore(true);
    try {
      setLoadError(null);

      const r = await listTodosServer({
        take: pageSize,
        cursor: nextCursor,
        filter: toBackendFilter(filter),
        q: debouncedQ,
      });

      const incoming = (r.items || []) as Todo[];
      const nextCur = (r.nextCursor ?? null) as string | null;

      const backendHasMore = typeof r.hasMore === "boolean" ? r.hasMore : null;
      const inferredHasMore = backendHasMore ?? !!nextCur;

      setItems((prev) => mergeUnique(prev, incoming));
      setNextCursor(nextCur);
      setHasMore(inferredHasMore);

      if (typeof r.totalAll === "number") setServerTotalAll(r.totalAll);
      if (typeof r.totalFiltered === "number") setServerTotalFiltered(r.totalFiltered);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível carregar mais tarefas.");
    } finally {
      setLoadingMore(false);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;

      if (!didInitialLoad.current) {
        didInitialLoad.current = true;
        loadFirstPage(true);
      }

      return () => {
        closeAllSwipes();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  useEffect(() => {
    if (!userId) return;
    if (!didInitialLoad.current) return;

    closeAllSwipes();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });

    setNextCursor(null);
    setHasMore(true);

    loadFirstPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedQ, userId]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadFirstPage(false);
    } finally {
      setRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((x) => x.done).length;
    return { total, done, open: total - done };
  }, [items]);

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

  function closeForm() {
    setModalOpen(false);
    setEditing(null);
  }

  async function openDetails(todo: Todo) {
    setSelected(todo);
    setDetailsOpen(true);

    const info = await getReminderInfo(todo.id);
    setSelectedReminder(info);

    setRemMode("once");

    const dt = new Date(Date.now() + 10 * 60 * 1000);
    setRemDate(`${dt.getFullYear()}-${two(dt.getMonth() + 1)}-${two(dt.getDate())}`);
    setRemTime(`${two(dt.getHours())}:${two(dt.getMinutes())}`);

    setRemEveryText("60");
    setRemUnit("minutes");

    if (info?.mode === "repeat" && info.every && info.unit) {
      setRemMode("repeat");
      setRemEveryText(String(info.every));
      setRemUnit(info.unit);
    }
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelected(null);
    setSelectedReminder(null);
  }

  async function saveForm() {
    if (!userId) return;
    if (isBusy) return;

    const title = formTitle.trim();
    const description = formDesc.trim() || null;
    if (!title) return;

    setBusy(true, editing ? "Salvando alterações…" : "Criando tarefa…");
    try {
      if (!editing) {
        await createTodo({ title, description });
      } else {
        await updateTodo(editing.id, { title, description });
      }

      closeForm();
      await loadFirstPage(false);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone(todo: Todo) {
    if (!userId) return;
    if (isBusy) return;

    try {
      swipes.get(todo.id)?.close?.();
      setBusy(true, "Atualizando tarefa…");

      const nextDone = !todo.done;
      await updateTodo(todo.id, { done: nextDone });

      setItems((prev) => {
        let next = prev.map((t) => (t.id === todo.id ? { ...t, done: nextDone } : t));
        if (filter === "open" && nextDone === true) next = next.filter((t) => t.id !== todo.id);
        if (filter === "done" && nextDone === false) next = next.filter((t) => t.id !== todo.id);
        return next;
      });

      if (selected?.id === todo.id) {
        setSelected((prev) => (prev ? { ...prev, done: nextDone } : prev));
      }
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(todo: Todo) {
    if (!userId) return;
    if (isBusy) return;

    swipes.get(todo.id)?.close?.();

    const ok = await confirmAction({
      title: "Excluir tarefa",
      message: "Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      destructive: true,
    });

    if (!ok) return;

    try {
      setBusy(true, "Excluindo tarefa…");

      await cancelReminder(todo.id);
      await deleteTodo(todo.id);

      setItems((prev) => prev.filter((t) => t.id !== todo.id));
      if (selected?.id === todo.id) closeDetails();

      setServerTotalAll((v) => (typeof v === "number" ? Math.max(0, v - 1) : v));
      setServerTotalFiltered((v) => (typeof v === "number" ? Math.max(0, v - 1) : v));
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAll() {
    if (!userId) return;
    if (busyBulkDelete || isBusy) return;

    const scopeMsg = isFiltered
      ? "Excluir TODAS as tarefas que correspondem aos filtros/busca atuais no servidor?"
      : "Excluir TODAS as suas tarefas no servidor?";

    const ok = await confirmAction({
      title: "Excluir tudo",
      message: `${scopeMsg} Essa ação não pode ser desfeita.`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      destructive: true,
    });

    if (!ok) return;

    setBusyBulkDelete(true);
    setBusy(true, "Excluindo tarefas…");
    try {
      closeAllSwipes();
      closeDetails();

      await Promise.all(items.map((t) => cancelReminder(t.id)));

      const r = !isFiltered
        ? await deleteTodosAll()
        : await deleteTodosBulk({ filter: toBackendFilter(filter), q: debouncedQ });

      setItems([]);
      setNextCursor(null);
      setHasMore(false);

      if (typeof r?.deleted === "number") {
        setServerTotalFiltered((v) => (typeof v === "number" ? Math.max(0, v - r.deleted) : v));
        if (!isFiltered) {
          setServerTotalAll((v) => (typeof v === "number" ? Math.max(0, v - r.deleted) : v));
        }
      }

      await loadFirstPage(false);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível excluir em massa.");
      await loadFirstPage(false);
    } finally {
      setBusy(false);
      setBusyBulkDelete(false);
    }
  }

  async function remindSelected(minutes: number) {
    if (!selected) return;

    const ok = await confirmAction({
      title: "Ativar lembrete",
      message: `Quer receber uma notificação em ${minutes} minuto(s) para esta tarefa?`,
      confirmText: "Ativar",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    try {
      setBusy(true, "Agendando lembrete…");
      const id = await scheduleReminderInMinutes(selected, minutes);

      if (!id) {
        setLoadError("Sem permissão para notificações. Verifique as configurações do aparelho.");
        return;
      }

      const info = await getReminderInfo(selected.id);
      setSelectedReminder(info);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível agendar o lembrete.");
    } finally {
      setBusy(false);
    }
  }

  async function remindSelectedAtDateTime() {
    if (!selected) return;

    const when = parseLocalDateTime(remDate, remTime);
    if (!when) {
      setLoadError("Data/hora inválida. Use YYYY-MM-DD e HH:MM (24h).");
      return;
    }

    const ok = await confirmAction({
      title: "Agendar lembrete",
      message: `Agendar notificação para ${when.toLocaleString()}?`,
      confirmText: "Agendar",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    try {
      setBusy(true, "Agendando lembrete…");
      const id = await scheduleReminderAt(selected, when);

      if (!id) {
        setLoadError("Sem permissão para notificações ou data muito próxima/no passado. Ajuste e tente novamente.");
        return;
      }

      const info = await getReminderInfo(selected.id);
      setSelectedReminder(info);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível agendar o lembrete.");
    } finally {
      setBusy(false);
    }
  }

  async function remindSelectedRepeat() {
    if (!selected) return;

    const every = safeIntFromText(remEveryText);
    if (!every || every < 1) {
      setLoadError("Intervalo inválido. Use um número inteiro >= 1.");
      return;
    }

    const monthNote =
      remUnit === "months"
        ? "\n\nObs.: 'meses' aqui é aproximado (1 mês = 30 dias). Para mensal exato, depois fazemos com listener global."
        : "";

    const unitPt =
      remUnit === "minutes"
        ? "minutos"
        : remUnit === "hours"
        ? "horas"
        : remUnit === "days"
        ? "dias"
        : remUnit === "weeks"
        ? "semanas"
        : "meses";

    const ok = await confirmAction({
      title: "Ativar lembrete recorrente",
      message: `Agendar notificação recorrente a cada ${every} ${unitPt}?${monthNote}`,
      confirmText: "Ativar",
      cancelText: "Cancelar",
    });

    if (!ok) return;

    try {
      setBusy(true, "Agendando recorrência…");
      const id = await scheduleReminderEvery(selected, every, remUnit);

      if (!id) {
        setLoadError("Sem permissão para notificações. Verifique as configurações do aparelho.");
        return;
      }

      const info = await getReminderInfo(selected.id);
      setSelectedReminder(info);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível agendar a recorrência.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSelectedReminder() {
    if (!selected) return;

    const ok = await confirmAction({
      title: "Cancelar lembrete",
      message: "Quer cancelar o lembrete desta tarefa?",
      confirmText: "Cancelar lembrete",
      cancelText: "Voltar",
      destructive: true,
    });

    if (!ok) return;

    try {
      setBusy(true, "Cancelando lembrete…");
      await cancelReminder(selected.id);
      setSelectedReminder(null);
      setLoadError(null);
    } finally {
      setBusy(false);
    }
  }

  const subtitle = `Pendentes ${stats.open} • Concluídas ${stats.done} • Itens carregados ${stats.total}`;

  const totalToShow = isFiltered ? serverTotalFiltered : serverTotalAll;
  const totalText =
    typeof totalToShow === "number"
      ? `Carregados: ${items.length} de ${totalToShow}${hasMore ? " • (há mais páginas)" : " • (fim)"}`
      : `Carregados: ${items.length}${hasMore ? " • (há mais no servidor)" : " • (fim)"}`;

  const disableBulk =
    busyBulkDelete ||
    isBusy ||
    (typeof totalToShow === "number" ? totalToShow === 0 : !items.length && !hasMore);

  const showEmpty = !isLoadingFirstPage && !refreshing;

  const reminderLabel = formatReminderLabel(selectedReminder);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!userId && onRequireLogin) onRequireLogin();
  }, [isBootstrapping, userId, onRequireLogin]);

  return {
    items,
    refreshing,
    isLoadingFirstPage,
    loadingMore,
    hasMore,

    filter,
    setFilter,
    q,
    setQ,
    debouncedQ,
    isFiltered,

    serverTotalAll,
    serverTotalFiltered,
    totalText,

    loadError,

    detailsOpen,
    modalOpen,
    selected,
    editing,

    formTitle,
    setFormTitle,
    formDesc,
    setFormDesc,

    selectedReminder,
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

    loadFirstPage,
    loadMore,
    onRefresh,

    openCreate,
    openEdit,
    openDetails,
    closeDetails,

    closeForm,

    saveForm,
    toggleDone,
    remove,
    removeAll,

    remindSelected,
    remindSelectedAtDateTime,
    remindSelectedRepeat,
    cancelSelectedReminder,

    subtitle,
    showEmpty,

    busyBulkDelete,
    disableBulk,
  };
}