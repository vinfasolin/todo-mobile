const DBG = process.env.EXPO_PUBLIC_DEBUG === "1";

export const logger = {
  log: (...args: any[]) => DBG && console.log(...args),
  warn: (...args: any[]) => DBG && console.warn(...args),
  error: (...args: any[]) => DBG && console.error(...args),
};
