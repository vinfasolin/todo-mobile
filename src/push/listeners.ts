// src/push/listeners.ts
import * as Notifications from "expo-notifications";
import type { Router } from "expo-router";

type PushTodoData = {
  todoId?: string;
  // action?: "open_todo" | "open_list";
};

// ✅ evita navegação duplicada (às vezes cold start + listener disparam)
let lastOpenedTodoId: string | null = null;
let lastOpenedAt = 0;

function safeTodoId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function getTodoIdFromResponse(
  response: Notifications.NotificationResponse | null | undefined
): string | null {
  const data = response?.notification?.request?.content?.data as PushTodoData | undefined;
  return safeTodoId(data?.todoId);
}

function getTodoIdFromNotification(
  notification: Notifications.Notification | null | undefined
): string | null {
  const data = notification?.request?.content?.data as PushTodoData | undefined;
  return safeTodoId(data?.todoId);
}

function getNotificationIdentifierFromResponse(
  response: Notifications.NotificationResponse | null | undefined
): string | null {
  const id = response?.notification?.request?.identifier;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function dismissFromResponse(response: Notifications.NotificationResponse) {
  const notificationId = getNotificationIdentifierFromResponse(response);
  if (!notificationId) return;

  try {
    // ✅ remove da central/bandeja quando o usuário interage
    await Notifications.dismissNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

async function handleOpenFromResponse(
  router: Router,
  response: Notifications.NotificationResponse
) {
  // ✅ primeiro tenta remover a notificação da bandeja
  await dismissFromResponse(response);

  const todoId = getTodoIdFromResponse(response);

  if (todoId) {
    const now = Date.now();
    // ✅ bloqueia duplicado do mesmo todo em janela curta
    if (lastOpenedTodoId === todoId && now - lastOpenedAt < 1500) return;

    lastOpenedTodoId = todoId;
    lastOpenedAt = now;

    router.push({ pathname: "/(drawer)/todo/[id]", params: { id: todoId } });
    return;
  }

  router.push("/(drawer)");
}

/**
 * Inicializa listeners de notificação e retorna cleanup().
 * Chame isso UMA vez no app, quando tiver Router pronto e usuário logado.
 */
export async function initPushListeners(router: Router) {
  // 1) Se o app foi aberto a partir de uma notificação (cold start)
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) {
      await handleOpenFromResponse(router, last);
    }
  } catch {
    // ignore
  }

  // 2) Notificação recebida enquanto app está aberto (foreground)
  const subReceived = Notifications.addNotificationReceivedListener((notification) => {
    // opcional: atualizar UI, toast, etc.
    const todoId = getTodoIdFromNotification(notification);
    if (todoId) {
      // console.log("push received for todo:", todoId);
    }
  });

  // 3) Usuário clicou na notificação (app em background/foreground)
  const subResponse = Notifications.addNotificationResponseReceivedListener(async (response) => {
    await handleOpenFromResponse(router, response);
  });

  return () => {
    try {
      subReceived.remove();
      subResponse.remove();
    } catch {
      // ignore
    }
  };
}