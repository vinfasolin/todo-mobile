// app/(drawer)/_reminders.local.ts
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import type { Todo } from "../../src/api/todos";

// =======================
// Types
// =======================
export type RepeatUnit = "minutes" | "hours" | "days" | "weeks" | "months";
export type ReminderMode = "once" | "repeat";

export type ReminderInfo = {
  id: string; // notificationId
  scheduledAt: string; // ISO do próximo disparo conhecido (ou vazio)
  mode?: ReminderMode; // once | repeat
  every?: number; // repeat
  unit?: RepeatUnit; // repeat
};

// =======================
// Storage
// =======================
const REMINDER_KEY_PREFIX = "todo_reminder_v3:"; // + todoId

function reminderKey(todoId: string) {
  return `${REMINDER_KEY_PREFIX}${todoId}`;
}

export async function getReminderInfo(todoId: string): Promise<ReminderInfo | null> {
  try {
    const raw = await SecureStore.getItemAsync(reminderKey(todoId));
    if (!raw) return null;

    // compat: se já salvou só o id (string), converte
    if (!raw.trim().startsWith("{")) {
      const id = raw.trim();
      if (!id) return null;
      return { id, scheduledAt: "", mode: "once" };
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.id === "string" && parsed.id.trim()) {
      const info: ReminderInfo = {
        id: parsed.id.trim(),
        scheduledAt: typeof parsed.scheduledAt === "string" ? parsed.scheduledAt : "",
        mode: parsed.mode === "repeat" ? "repeat" : "once",
        every: typeof parsed.every === "number" ? parsed.every : undefined,
        unit:
          parsed.unit === "minutes" ||
          parsed.unit === "hours" ||
          parsed.unit === "days" ||
          parsed.unit === "weeks" ||
          parsed.unit === "months"
            ? parsed.unit
            : undefined,
      };
      return info;
    }

    return null;
  } catch {
    return null;
  }
}

export async function setReminderInfo(todoId: string, info: ReminderInfo) {
  try {
    await SecureStore.setItemAsync(reminderKey(todoId), JSON.stringify(info));
  } catch {
    // ignore
  }
}

export async function clearReminderInfo(todoId: string) {
  try {
    await SecureStore.deleteItemAsync(reminderKey(todoId));
  } catch {
    // ignore
  }
}

// =======================
// Android channel + permission
// =======================
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  } catch {
    // ignore
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;

    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }

    return status === "granted";
  } catch {
    return false;
  }
}

// =======================
// Helpers
// =======================
export function two(n: number) {
  return String(n).padStart(2, "0");
}

export function safeIntFromText(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

// parse simples "YYYY-MM-DD" + "HH:MM" (24h) -> Date local
export function parseLocalDateTime(dateStr: string, timeStr: string): Date | null {
  const d = dateStr.trim();
  const t = timeStr.trim();

  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const m2 = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m1 || !m2) return null;

  const year = Number(m1[1]);
  const month = Number(m1[2]); // 1-12
  const day = Number(m1[3]);
  const hour = Number(m2[1]);
  const minute = Number(m2[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  )
    return null;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;

  // validações extras (ex: 2026-02-31 vira março)
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day ||
    dt.getHours() !== hour ||
    dt.getMinutes() !== minute
  ) {
    return null;
  }

  return dt;
}

export function formatReminderLabel(info: ReminderInfo | null) {
  if (!info) return "Nenhum lembrete ativo";

  if (info.mode === "repeat" && info.every && info.unit) {
    const next = info.scheduledAt ? new Date(info.scheduledAt) : null;
    const nextTxt = next && Number.isFinite(next.getTime()) ? next.toLocaleString() : "—";
    const unitPt =
      info.unit === "minutes"
        ? "min"
        : info.unit === "hours"
        ? "hora(s)"
        : info.unit === "days"
        ? "dia(s)"
        : info.unit === "weeks"
        ? "semana(s)"
        : "mês(es)";
    return `Recorrente: a cada ${info.every} ${unitPt} • Próximo: ${nextTxt}`;
  }

  if (info.scheduledAt) {
    const dt = new Date(info.scheduledAt);
    if (Number.isFinite(dt.getTime())) return `Agendado: ${dt.toLocaleString()}`;
  }

  return "Lembrete ativo";
}

// =======================
// Internal: dismiss visible notifications tied to todoId
// =======================
async function dismissPresentedNotificationsByTodoId(todoId: string) {
  try {
    // Notificações atualmente "apresentadas" (visíveis)
    const presented = await Notifications.getPresentedNotificationsAsync();
    if (!presented?.length) return;

    const matches = presented.filter((n) => {
      const data: any = (n as any)?.request?.content?.data;
      return data && String(data.todoId || "") === String(todoId);
    });

    for (const n of matches) {
      const id = (n as any)?.request?.identifier;
      if (typeof id === "string" && id) {
        try {
          await Notifications.dismissNotificationAsync(id);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}

export async function cancelReminder(todoId: string) {
  const existing = await getReminderInfo(todoId);

  try {
    // 1) Remove qualquer notificação já apresentada (bandeja) relacionada ao todoId
    await dismissPresentedNotificationsByTodoId(todoId);

    // 2) Se temos o id salvo, tenta cancelar o agendamento e também "dismiss" por id (extra-safe)
    if (existing?.id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(existing.id);
      } catch {
        // ignore (ex: id inexistente)
      }

      try {
        await Notifications.dismissNotificationAsync(existing.id);
      } catch {
        // ignore
      }
    }
  } finally {
    // 3) Limpa storage (mesmo se algo falhar)
    await clearReminderInfo(todoId);
  }
}

// =======================
// Scheduling (trigger helpers)
// =======================
function makeTimeIntervalTrigger(seconds: number, repeats: boolean) {
  // compat com versões que exigem `type`
  return { type: "timeInterval", seconds, repeats } as any;
}

function makeDateTrigger(date: Date) {
  // compat com versões que exigem `type`
  return { type: "date", date } as any;
}

function intervalSeconds(every: number, unit: RepeatUnit): number {
  const e = Math.max(1, Math.floor(every));

  const MIN = 60;
  const HOUR = 60 * 60;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const AVG_MONTH_SECONDS = 2629746; // mês médio em segundos (inteiro)

  switch (unit) {
    case "minutes":
      return e * MIN;
    case "hours":
      return e * HOUR;
    case "days":
      return e * DAY;
    case "weeks":
      return e * WEEK;
    case "months":
      return e * AVG_MONTH_SECONDS;
    default:
      return e * MIN;
  }
}

function baseContent(todo: Todo) {
  return {
    title: "⏰ Lembrete de tarefa",
    body: todo.title,
    sound: "default" as const,
    // ✅ vínculo forte com o ToDo
    data: { todoId: todo.id },
    ...(Platform.OS === "android" ? { channelId: "default" } : {}),
  };
}

// 🔔 uma vez: “em X minutos”
export async function scheduleReminderInMinutes(todo: Todo, minutes: number) {
  await ensureAndroidChannel();
  await cancelReminder(todo.id);

  const okPerm = await ensureNotificationPermission();
  if (!okPerm) return null;

  const seconds = Math.max(60, Math.floor(minutes * 60)); // iOS costuma exigir >= 60s

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: baseContent(todo),
    trigger: makeTimeIntervalTrigger(seconds, false),
  });

  await setReminderInfo(todo.id, {
    id: notificationId,
    scheduledAt: new Date(Date.now() + seconds * 1000).toISOString(),
    mode: "once",
  });

  return notificationId;
}

// 🔔 uma vez: data/hora futura
export async function scheduleReminderAt(todo: Todo, when: Date) {
  await ensureAndroidChannel();
  await cancelReminder(todo.id);

  const okPerm = await ensureNotificationPermission();
  if (!okPerm) return null;

  const now = Date.now();
  const target = when.getTime();
  if (!Number.isFinite(target) || target <= now + 10_000) return null; // evita passado / muito próximo

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: baseContent(todo),
    trigger: makeDateTrigger(when),
  });

  await setReminderInfo(todo.id, {
    id: notificationId,
    scheduledAt: when.toISOString(),
    mode: "once",
  });

  return notificationId;
}

// 🔁 recorrente: a cada X unidade
export async function scheduleReminderEvery(todo: Todo, every: number, unit: RepeatUnit) {
  await ensureAndroidChannel();
  await cancelReminder(todo.id);

  const okPerm = await ensureNotificationPermission();
  if (!okPerm) return null;

  const secondsRaw = intervalSeconds(every, unit);
  const seconds = Math.max(60, Math.floor(secondsRaw));

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      ...baseContent(todo),
      title: "⏰ Lembrete recorrente",
      data: { todoId: todo.id, repeatEvery: every, repeatUnit: unit },
    },
    trigger: makeTimeIntervalTrigger(seconds, true),
  });

  await setReminderInfo(todo.id, {
    id: notificationId,
    scheduledAt: new Date(Date.now() + seconds * 1000).toISOString(),
    mode: "repeat",
    every: Math.max(1, Math.floor(every)),
    unit,
  });

  return notificationId;
}