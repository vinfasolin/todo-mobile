import { api } from "./client";

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listTodos() {
  return api<{ ok: true; items: Todo[] }>("/todos");
}

export async function createTodo(payload: { title: string; description?: string | null }) {
  return api<{ ok: true; todo: Todo }>("/todos", { method: "POST", body: payload });
}

export async function updateTodo(
  id: string,
  payload: Partial<Pick<Todo, "title" | "description" | "done">>
) {
  return api<{ ok: true; todo: Todo }>(`/todos/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteTodo(id: string) {
  return api<{ ok: true }>(`/todos/${id}`, { method: "DELETE" });
}
