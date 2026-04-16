// src/ui/components.tsx
import React from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
  ViewStyle,
  TextStyle,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { theme } from "./theme";
import { useAuth } from "../auth/AuthProvider";

export function Screen({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safe, padded && styles.safePadded, style]}
    >
      {children}
    </SafeAreaView>
  );
}

/**
 * AppShell: use nas telas para garantir o BusyOverlay por cima do conteúdo.
 * (se você já usa Screen direto, pode trocar por AppShell sem quebrar)
 */
export function AppShell({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  const { isBusy, busyMessage } = useAuth();

  return (
    <View style={styles.shell}>
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safe, padded && styles.safePadded, style]}
      >
        {children}
      </SafeAreaView>

      <BusyOverlay visible={isBusy} message={busyMessage} />
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function Muted({
  children,
  numberOfLines,
  style,
}: {
  children: React.ReactNode;
  numberOfLines?: number;
  style?: TextStyle;
}) {
  return (
    <Text style={[styles.muted, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/**
 * TextField: input padrão do app (login/register/forms).
 */
export function TextField(props: TextInputProps) {
  const { style, editable = true, ...rest } = props;

  return (
    <TextInput
      editable={editable}
      placeholderTextColor={theme.muted}
      style={[styles.input, editable ? null : styles.inputDisabled, style as any]}
      {...rest}
    />
  );
}

/**
 * Pill: chip premium
 */
export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active ? styles.pillActive : styles.pillInactive,
        pressed && onPress ? styles.pressSoft : null,
      ]}
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Botão do menu (Drawer) – estilo “icon button premium”.
 */
export function DrawerMenuButton({
  accessibilityLabel = "Abrir menu",
}: {
  accessibilityLabel?: string;
}) {
  const nav: any = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => nav?.openDrawer?.()}
      hitSlop={12}
      style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressIcon : null]}
    >
      <Ionicons name="menu" size={22} color={theme.text} />
    </Pressable>
  );
}

/**
 * Header premium (card com gradiente leve).
 */
export function PremiumHeader({
  title,
  subtitle,
  right,
  left,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={[theme.card, theme.accentSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {left ? <View style={{ marginRight: 10 }}>{left}</View> : null}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.headerSub} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
    </LinearGradient>
  );
}

/**
 * PrimaryButton – refinado:
 * - primary: gradiente leve
 * - ghost: superfície card2 + borda suave
 * - danger: gradiente vermelho
 */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  leftIcon,
  style,
  fullWidth = true,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "danger" | "ghost";
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
  /**
   * ✅ novo: permite usar o botão “inline” (ex.: no header) sem ocupar 100% do container.
   * - true (padrão): width: "100%"
   * - false: width automático (minWidth/width ficam por conta do container)
   */
  fullWidth?: boolean;
}) {
  const isDisabled = !!disabled || !!loading;

  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";
  const isPrimary = variant === "primary";

  const borderColor = isGhost ? theme.line : "transparent";
  const textColor = isGhost ? theme.text : "#fff";
  const spinnerColor = isGhost ? theme.accent : "#fff";

  const content = (
    <View style={styles.btnContent}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
          <Text style={[styles.btnText, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btnBase,
        !fullWidth ? styles.btnAuto : null,
        isGhost ? styles.btnGhost : null,
        isDanger ? styles.btnDanger : null,
        isPrimary ? styles.btnPrimary : null,
        { borderColor },
        pressed && !isDisabled ? styles.btnPressed : null,
        isDisabled ? styles.btnDisabled : null,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[theme.accent, theme.accent2 ?? theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btnFill}
        >
          {content}
        </LinearGradient>
      ) : isDanger ? (
        <LinearGradient
          colors={[theme.danger, "#B91C1C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btnFill}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

function BusyOverlay({
  visible,
  message,
}: {
  visible: boolean;
  message?: string | null;
}) {
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.busyBackdrop}>
        <View style={styles.busyCard}>
          <ActivityIndicator color={theme.accent} />
          <View style={{ height: 10 }} />
          <Text style={styles.busyTitle}>Aguarde…</Text>
          {message ? (
            <Text style={styles.busyMsg} numberOfLines={3}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  shell: { flex: 1, width: "100%" },

  safe: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: theme.bg,
  },
  safePadded: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },

  card: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: (theme as any).shadow?.color ?? "#0F172A",
        shadowOpacity: (theme as any).shadow?.opacity ?? 0.1,
        shadowRadius: (theme as any).shadow?.radius ?? 16,
        shadowOffset: { width: 0, height: (theme as any).shadow?.y ?? 10 },
      },
      android: { elevation: (theme as any).shadow?.elevation ?? 5 },
      default: {},
    }),
  },

  title: {
    color: theme.text,
    fontSize: theme.font.title,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  sectionTitle: {
    color: theme.text,
    fontWeight: "900",
    fontSize: 16,
  },

  muted: {
    color: theme.muted,
    fontSize: theme.font.body,
    lineHeight: 22,
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    backgroundColor: theme.card2,
    fontSize: theme.font.body,
    fontWeight: "600",
  },
  inputDisabled: {
    opacity: 0.85,
  },

  pill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillInactive: {
    borderColor: theme.line,
    backgroundColor: theme.card,
  },
  pillActive: {
    borderColor: "transparent",
    backgroundColor: theme.accent,
  },
  pillText: {
    color: theme.text,
    fontWeight: "800",
    fontSize: theme.font.tiny,
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: "#fff",
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    ...Platform.select({
      ios: {
        shadowColor: (theme as any).shadow?.color ?? "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },

  header: {
    width: "100%",
    alignSelf: "stretch",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: (theme as any).shadow?.color ?? "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  headerSub: {
    color: theme.muted,
    marginTop: 4,
    fontSize: theme.font.body,
    fontWeight: "600",
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ✅ base do botão
  btnBase: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  // ✅ novo: quando for inline, não força width 100%
  btnAuto: {
    width: "auto",
    alignSelf: "auto",
  },

  btnFill: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: theme.font.body,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  btnPrimary: {
    borderColor: "transparent",
  },
  btnDanger: {
    borderColor: "transparent",
  },
  btnGhost: {
    backgroundColor: theme.card2,
    borderColor: theme.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  btnPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  pressSoft: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  pressIcon: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  busyBackdrop: {
    flex: 1,
    backgroundColor: (theme as any).overlay ?? "rgba(15, 23, 42, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  busyCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: (theme as any).shadow?.color ?? "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  busyTitle: {
    color: theme.text,
    fontWeight: "900",
    fontSize: 16,
  },
  busyMsg: {
    color: theme.muted,
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
});