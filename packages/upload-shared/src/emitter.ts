export class Emitter<TEventMap extends Record<string, (...args: any[]) => void>> {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof TEventMap>(event: K, fn: TEventMap[K]): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(fn);

    return () => {
      this.listeners.get(event as string)?.delete(fn);
    };
  }

  off<K extends keyof TEventMap>(event: K, fn: TEventMap[K]): void {
    this.listeners.get(event as string)?.delete(fn);
  }

  emit<K extends keyof TEventMap>(event: K, ...args: Parameters<TEventMap[K]>): void {
    this.listeners.get(event as string)?.forEach((fn) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Error in ${event as string} listener:`, err);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
