export function formatDateSafe(v?: string | null) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export function normalizeEmail(email: string) {
  return (email || "").trim().toLowerCase();
}
