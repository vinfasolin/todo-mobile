// src/api/todos.ts
import { api } from "./client";

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TodosStatus = "all" | "open" | "done";

type AnyObj = Record<string, any>;

function pickItems(obj: any): Todo[] {
  if (!obj) return [];
  return (
    (Array.isArray(obj.items) && obj.items) ||
    (Array.isArray(obj.todos) && obj.todos) ||
    (Array.isArray(obj.data) && obj.data) ||
    (Array.isArray(obj.result) && obj.result) ||
    []
  );
}

function pickNextCursor(obj: any): string | null {
  if (!obj) return null;

  const v =
    obj.nextCursor ??
    obj.next_cursor ??
    obj.next ??
    obj.cursor ??
    obj.nextPageCursor ??
    obj.next_page_cursor ??
    null;

  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function pickHasMore(obj: any): boolean | null {
  if (!obj) return null;

  const v =
    obj.hasMore ??
    obj.has_more ??
    obj.more ??
    obj.hasNext ??
    obj.has_next ??
    null;

  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;

  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return null;
}

function toSafeNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Totais:
 *  - totalAll: total geral do usuário (sem filtro)
 *  - totalFiltered: total considerando filtro/busca atuais
 *
 * Compat:
 *  - total => tratar como totalFiltered
 *  - count/totalCount/total_count => tratar como totalFiltered
 */
function pickTotals(obj: any): { totalAll: number | null; totalFiltered: number | null } {
  if (!obj) return { totalAll: null, totalFiltered: null };

  const totalAllRaw =
    obj.totalAll ?? obj.total_all ?? obj.allTotal ?? obj.all_total ?? null;

  const totalFilteredRaw =
    obj.totalFiltered ??
    obj.total_filtered ??
    obj.filteredTotal ??
    obj.filtered_total ??
    obj.total ??
    obj.count ??
    obj.totalCount ??
    obj.total_count ??
    null;

  return {
    totalAll: toSafeNumber(totalAllRaw),
    totalFiltered: toSafeNumber(totalFilteredRaw),
  };
}

function pickFromWrappers(root: AnyObj): {
  items: Todo[];
  nextCursor: string | null;
  hasMore: boolean | null;
  totalAll: number | null;
  totalFiltered: number | null;
} {
  const directItems = pickItems(root);
  const directCursor = pickNextCursor(root);
  const directHasMore = pickHasMore(root);
  const directTotals = pickTotals(root);

  if (
    Array.isArray(directItems) &&
    (directItems.length || directCursor !== null || directHasMore !== null)
  ) {
    return {
      items: directItems,
      nextCursor: directCursor,
      hasMore: directHasMore,
      ...directTotals,
    };
  }

  const wrappers = [root.data, root.result, root.payload, root.body];
  for (const w of wrappers) {
    if (!w) continue;

    if (Array.isArray(w)) {
      return {
        items: w as Todo[],
        nextCursor: null,
        hasMore: null,
        totalAll: null,
        totalFiltered: null,
      };
    }

    const pickedItems = pickItems(w);
    const pickedCursor = pickNextCursor(w);
    const pickedHasMore = pickHasMore(w);
    const pickedTotals = pickTotals(w);

    if (Array.isArray(pickedItems) || pickedCursor !== null || pickedHasMore !== null) {
      return {
        items: Array.isArray(pickedItems) ? (pickedItems as Todo[]) : [],
        nextCursor: pickedCursor,
        hasMore: pickedHasMore,
        ...pickedTotals,
      };
    }
  }

  return {
    items: Array.isArray(directItems) ? directItems : [],
    nextCursor: directCursor,
    hasMore: directHasMore,
    ...directTotals,
  };
}

function clampInt(n: any, fallback: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(Math.max(Math.trunc(v), min), max);
}

function cleanStr(v: any): string {
  return String(v ?? "").trim();
}

/**
 * Lista com filtros server-side + paginação cursor-based
 *
 * Backend atual:
 *  - GET /todos?take=20&cursor=<cursor>&filter=open|done&q=<busca>
 *
 * Aliases aceitos no client:
 *  - limit -> take
 *  - status/filter -> filter
 *  - search -> q
 */
export async function listTodosServer(opts?: {
  take?: number;
  limit?: number;
  cursor?: string | null;

  status?: TodosStatus; // alias de entrada no client
  filter?: TodosStatus;

  q?: string;
  search?: string;

  done?: any;
}): Promise<{
  ok: true;
  items: Todo[];
  nextCursor: string | null;
  hasMore: boolean;
  totalAll: number | null;
  totalFiltered: number | null;
}> {
  const take = clampInt(opts?.take ?? opts?.limit, 20, 1, 50);
  const cursor = cleanStr(opts?.cursor);

  const filter: TodosStatus =
    ((opts?.filter ?? opts?.status ?? "all") as TodosStatus) ?? "all";

  const q = cleanStr(opts?.q ?? opts?.search);

  const qs = new URLSearchParams();
  qs.set("take", String(take));
  if (cursor) qs.set("cursor", cursor);

  if (filter !== "all") {
    qs.set("filter", filter);
  }

  if (q) qs.set("q", q);

  if (opts?.done !== undefined && opts?.done !== null) {
    qs.set("done", String(opts.done));
  }

  const res = await api<any>(`/todos?${qs.toString()}`);

  if (Array.isArray(res)) {
    return {
      ok: true,
      items: res as Todo[],
      nextCursor: null,
      hasMore: false,
      totalAll: null,
      totalFiltered: null,
    };
  }

  const root: AnyObj = res ?? {};
  if (root.ok === false) {
    throw new Error(root.message || root.error || "Falha ao carregar tarefas.");
  }

  const { items, nextCursor, hasMore, totalAll, totalFiltered } = pickFromWrappers(root);

  if (!Array.isArray(items)) {
    const keys = Object.keys(root || {}).slice(0, 12).join(", ");
    throw new Error(`Formato inesperado em /todos. Chaves: ${keys || "(nenhuma)"}`);
  }

  const inferredHasMore = typeof hasMore === "boolean" ? hasMore : !!nextCursor;

  return {
    ok: true,
    items,
    nextCursor: nextCursor ?? null,
    hasMore: inferredHasMore,
    totalAll,
    totalFiltered,
  };
}

/**
 * Compat: paginação cursor-based simples (sem filtros)
 */
export async function listTodosPaged(opts?: {
  take?: number;
  cursor?: string | null;
}): Promise<{
  ok: true;
  items: Todo[];
  nextCursor: string | null;
  hasMore: boolean;
  totalAll: number | null;
  totalFiltered: number | null;
}> {
  return listTodosServer({
    take: opts?.take ?? 5,
    cursor: opts?.cursor ?? null,
    filter: "all",
    q: "",
  });
}

/**
 * Compat: lista completa — pagina até acabar
 */
export async function listTodos(): Promise<{ ok: true; items: Todo[] }> {
  const all: Todo[] = [];
  let cursor: string | null = null;

  for (let guard = 0; guard < 2000; guard++) {
    const r = await listTodosServer({ take: 50, cursor, filter: "all", q: "" });

    all.push(...(r.items || []));

    const next = r.nextCursor;
    if (!next) break;
    if (next === cursor) break;

    cursor = next;
  }

  return { ok: true, items: all };
}

export async function createTodo(payload: { title: string; description?: string | null }) {
  return api<{ ok: true; todo: Todo }>("/todos", { method: "POST", body: payload });
}

export async function updateTodo(
  id: string,
  payload: Partial<Pick<Todo, "title" | "description" | "done">>
) {
  return api<{ ok: true; todo: Todo }>(`/todos/${id}`, { method: "PATCH", body: payload });
}

export async function deleteTodo(id: string) {
  return api<{ ok: true }>(`/todos/${id}`, { method: "DELETE" });
}

/**
 * Excluir tudo (sem filtro) — DELETE /todos
 */
export async function deleteTodosAll(): Promise<{ ok: true; deleted: number }> {
  return api<{ ok: true; deleted: number }>(`/todos`, { method: "DELETE" });
}

/**
 * Bulk delete
 * Backend atual:
 * DELETE /todos/bulk?filter=open|done&q=...
 */
export async function deleteTodosBulk(opts?: {
  status?: TodosStatus; // alias de entrada no client
  filter?: TodosStatus;
  q?: string;
  search?: string;
  done?: any;
}): Promise<{ ok: true; deleted: number }> {
  const filter: TodosStatus =
    ((opts?.filter ?? opts?.status ?? "all") as TodosStatus) ?? "all";

  const q = cleanStr(opts?.q ?? opts?.search);

  const qs = new URLSearchParams();
  if (filter !== "all") {
    qs.set("filter", filter);
  }
  if (q) {
    qs.set("q", q);
  }
  if (opts?.done !== undefined && opts?.done !== null) {
    qs.set("done", String(opts.done));
  }

  const suffix = qs.toString();
  return api<{ ok: true; deleted: number }>(`/todos/bulk${suffix ? `?${suffix}` : ""}`, {
    method: "DELETE",
  });
}