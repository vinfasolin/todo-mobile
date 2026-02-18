import React from "react";
import { Platform, Pressable, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "./theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: theme.bg }}>{children}</View>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: 16,
          padding: 14,
          shadowColor: "#000",
          shadowOpacity: Platform.OS === "web" ? 0 : 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800" }}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: theme.muted }}>{children}</Text>;
}

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
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "transparent" : theme.line,
        backgroundColor: active ? theme.accent : "transparent",
      }}
    >
      <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PremiumHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={["#1C2B4A", "#0B0F17"]}
      style={{
        paddingTop: 54,
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.line,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: theme.muted, marginTop: 4 }}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={{ alignItems: "flex-end" }}>{right}</View> : null}
      </View>
    </LinearGradient>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: theme.accent,
        opacity: disabled ? 0.6 : 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}
