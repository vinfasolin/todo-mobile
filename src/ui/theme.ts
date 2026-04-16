// src/ui/theme.ts
export const theme = {
  /**
   * 🎨 Paleta (claro/premium)
   * - Fundo levemente “off-white” para não ficar estourado
   * - Cards bem brancos com borda suave
   * - Segunda superfície (inputs, botões ghost, icon buttons)
   */
  bg: "#F7F9FC", // fundo principal (ligeiramente mais suave que #FFF)
  card: "#FFFFFF", // superfície principal
  card2: "#F1F5F9", // superfície secundária (inputs / botões ghost / chips)
  text: "#0F172A", // slate-900
  muted: "#475569", // slate-600
  line: "#E5EAF2", // borda mais “premium” (menos contrastada)

  /**
   * ✨ Extras (opcionais)
   * Você pode usar depois sem quebrar o que já existe.
   */
  bg2: "#EEF2F7", // para backgrounds internos/sections
  line2: "#D7DEE9", // borda um pouco mais forte quando necessário
  overlay: "rgba(15, 23, 42, 0.28)", // overlay de modal

  /**
   * 🟦 Marca
   * - accent: principal
   * - accent2: para gradientes / highlights / foco
   */
  accent: "#2563EB", // blue-600
  accent2: "#1D4ED8", // blue-700 (para profundidade em gradiente)
  accentSoft: "#EAF0FF", // fundo sutil para estados/realces

  /**
   * ✅ Estados
   */
  good: "#16A34A",
  danger: "#DC2626",
  warn: "#D97706",

  /**
   * 🔤 Tipografia (maior e mais “app”)
   * (mantém suas chaves atuais para não quebrar o projeto)
   */
  font: {
    title: 22,
    h1: 26,
    h2: 20,
    body: 16,
    small: 14,
    tiny: 13,
  },

  /**
   * 🧩 Raio (um pouco mais arredondado = mais premium)
   */
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 26,
  },

  /**
   * 🌫️ Sombra (mais suave)
   * - iOS usa shadow*; Android usa elevation
   */
  shadow: {
    opacity: 0.10,
    radius: 16,
    elevation: 5,
    color: "#0F172A",
    y: 10,
  },

  /**
   * 📏 Espaçamentos (opcional)
   * se quiser padronizar depois
   */
  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
} as const;