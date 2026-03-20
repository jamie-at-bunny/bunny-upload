import type { FileManagerEventMap } from "./types";

export class Emitter {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof FileManagerEventMap>(
    event: K,
    fn: FileManagerEventMap[K]
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);

    return () => {
      this.listeners.get(event)?.delete(fn);
    };
  }

  off<K extends keyof FileManagerEventMap>(
    event: K,
    fn: FileManagerEventMap[K]
  ): void {
    this.listeners.get(event)?.delete(fn);
  }

  emit<K extends keyof FileManagerEventMap>(
    event: K,
    ...args: Parameters<FileManagerEventMap[K]>
  ): void {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
