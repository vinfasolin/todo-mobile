type Handler<T = any> = (payload?: T) => void;

export class TinyEmitter {
  private map = new Map<string, Set<Handler>>();

  on<T = any>(event: string, fn: Handler<T>) {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event)!.add(fn as Handler);
    return () => this.off(event, fn);
  }

  off<T = any>(event: string, fn: Handler<T>) {
    this.map.get(event)?.delete(fn as Handler);
  }

  emit<T = any>(event: string, payload?: T) {
    const set = this.map.get(event);
    if (!set || set.size === 0) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch {
        // não deixa um handler quebrar o app
      }
    }
  }
}

export const events = new TinyEmitter();
