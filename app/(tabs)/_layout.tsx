import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/ui/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.bg, borderTopColor: theme.line },
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: "rgba(234,240,255,0.55)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "To-Dos",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
