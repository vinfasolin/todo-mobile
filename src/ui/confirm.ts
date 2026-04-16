// src/ui/confirm.ts
import { Alert, Platform } from "react-native";

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

/**
 * Confirmação padrão do app.
 * - Mobile: Alert nativo
 * - Web: window.confirm (mais confiável no Expo web)
 */
export function confirmAction(opts: ConfirmOpts): Promise<boolean> {
  const {
    title = "Confirmação",
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    destructive = false,
  } = opts;

  if (Platform.OS === "web") {
    const confirmFn = (globalThis as any)?.confirm as ((msg: string) => boolean) | undefined;
    if (!confirmFn) return Promise.resolve(false); // ✅ mais seguro
    return Promise.resolve(confirmFn(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true } // ✅ permite fechar tocando fora (android)
    );
  });
}