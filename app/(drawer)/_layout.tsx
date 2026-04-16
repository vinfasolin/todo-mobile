// app/(drawer)/_layout.tsx
import React, { useMemo } from "react";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { Image, Platform, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/auth/AuthProvider";
import { theme } from "../../src/ui/theme";
import { PrimaryButton } from "../../src/ui/components";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout, isBusy } = useAuth();

  const name = (user as any)?.name?.trim() || "Usuário";
  const email = (user as any)?.email?.trim() || "—";
  const picture = (user as any)?.picture as string | undefined;

  // ✅ remove do menu rotas "helper" (arquivos que começam com "_")
  const filteredState = useMemo(() => {
    const routes = props.state.routes.filter((r) => !r.name.startsWith("_"));
    const routeNames = props.state.routeNames.filter((n) => !n.startsWith("_"));

    // se o índice atual aponta para algo removido, cai para o primeiro visível
    const safeIndex = routes.length ? Math.min(props.state.index, routes.length - 1) : 0;

    return {
      ...props.state,
      routes,
      routeNames,
      index: safeIndex,
    };
  }, [props.state]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar
        barStyle="dark-content"
        translucent={false}
        backgroundColor={Platform.OS === "android" ? theme.bg : undefined}
      />

      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={{ paddingTop: 0, backgroundColor: theme.bg }}
        >
          {/* HEADER: avatar + nome + email */}
          <View
            style={{
              backgroundColor: theme.card,
              borderBottomWidth: 1,
              borderBottomColor: theme.line,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 56,
              }}
            >
              {picture ? (
                <Image
                  source={{ uri: picture }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: theme.line,
                    backgroundColor: theme.card2,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.card2,
                    borderWidth: 1,
                    borderColor: theme.line,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person-outline" size={20} color={theme.muted} />
                </View>
              )}

              <View style={{ flex: 1, justifyContent: "center", minWidth: 0 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "900",
                    fontSize: 16,
                  }}
                  numberOfLines={1}
                >
                  {name}
                </Text>

                <Text
                  style={{
                    color: theme.muted,
                    fontWeight: "700",
                    fontSize: 13,
                    marginTop: 3,
                  }}
                  numberOfLines={1}
                >
                  {email}
                </Text>
              </View>
            </View>
          </View>

          {/* Itens do menu (somente telas “reais”) */}
          <View style={{ paddingTop: 10 }}>
            <DrawerItemList {...props} state={filteredState as any} />
          </View>

          <View style={{ height: 6 }} />
        </DrawerContentScrollView>

        {/* FOOTER: botão Sair */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 18,
            borderTopWidth: 1,
            borderTopColor: theme.line,
            backgroundColor: theme.bg,
          }}
        >
          <PrimaryButton
            label="Sair"
            onPress={() => logout()}
            variant="danger"
            disabled={isBusy}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerStyle: { backgroundColor: theme.bg, width: 290 },
        drawerContentStyle: { backgroundColor: theme.bg },

        drawerActiveTintColor: theme.text,
        drawerInactiveTintColor: theme.text,
        drawerActiveBackgroundColor: "#E8EEFF",

        drawerItemStyle: {
          borderRadius: 999,
          marginHorizontal: 10,
          marginVertical: 3,
        },
        drawerLabelStyle: {
          fontWeight: "900",
          fontSize: 14,
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "To-Dos",
          drawerIcon: ({ size, color }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: "Perfil",
          drawerIcon: ({ size, color }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="todo/[id]"
        options={{
          title: "To-Do",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}