import { Emitter } from "./emitter";
import type {
  ActionContext,
  FileManagerAction,
  FileManagerEventMap,
  FileManagerOptions,
  FileManagerState,
  ListResponse,
  StorageEntry,
} from "./types";

const DEFAULT_ENDPOINT = "/.bunny/files";

export class FileManager {
  private emitter = new Emitter<FileManagerEventMap>();
  private state: FileManagerState;
  private endpoint: string;
  private cdnBase: string | undefined;
  private actions = new Map<string, FileManagerAction>();
  private subscribers = new Set<() => void>();
  private stateSnapshot: FileManagerState;

  constructor(options: FileManagerOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.cdnBase = options.cdnBase;

    this.state = {
      currentPath: options.initialPath ?? "/",
      entries: [],
      selected: new Set(),
      status: "idle",
    };
    this.stateSnapshot = this.state;

    // Register initial actions
    if (options.actions) {
      for (const action of options.actions) {
        this.actions.set(action.id, action);
      }
    }
  }

  // ── State management ───────────────────────────────────────

  getState(): FileManagerState {
    return this.stateSnapshot;
  }

  /** For useSyncExternalStore / framework integrations */
  subscribe(listener: () => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private setState(partial: Partial<FileManagerState>): void {
    this.state = { ...this.state, ...partial };
    // Create new reference for useSyncExternalStore
    this.stateSnapshot = { ...this.state };
    this.emitter.emit("state-change", this.stateSnapshot);
    this.subscribers.forEach((fn) => fn());
  }

  // ── Navigation ─────────────────────────────────────────────

  async navigate(path: string): Promise<void> {
    const normalizedPath = path.startsWith("/") ? path : "/" + path;

    this.setState({
      currentPath: normalizedPath,
      status: "loading",
      error: undefined,
      selected: new Set(),
    });

    this.emitter.emit("navigate", normalizedPath);

    try {
      const url = `${this.endpoint}?path=${encodeURIComponent(normalizedPath)}`;
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Failed to list directory (${res.status})`);
      }

      const data: ListResponse = await res.json();

      // Pick up cdnBase from server if not configured
      if (!this.cdnBase && data.cdnBase) {
        this.cdnBase = data.cdnBase;
      }

      this.setState({
        entries: data.entries,
        status: "idle",
      });

      this.emitter.emit("entries-loaded", data.entries);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.setState({
        status: "error",
        error: error.message,
      });
      this.emitter.emit("error", error);
    }
  }

  async goUp(): Promise<void> {
    const { currentPath } = this.state;
    if (currentPath === "/") return;

    // Remove trailing slash, then go to parent
    const trimmed = currentPath.replace(/\/$/, "");
    const parent = trimmed.substring(0, trimmed.lastIndexOf("/")) || "/";
    await this.navigate(parent);
  }

  async refresh(): Promise<void> {
    await this.navigate(this.state.currentPath);
  }

  getBreadcrumbs(): { label: string; path: string }[] {
    const parts = this.state.currentPath.split("/").filter(Boolean);
    const crumbs: { label: string; path: string }[] = [
      { label: "Root", path: "/" },
    ];

    let accumulated = "";
    for (const part of parts) {
      accumulated += "/" + part;
      crumbs.push({ label: part, path: accumulated });
    }

    return crumbs;
  }

  // ── Selection ──────────────────────────────────────────────

  select(guid: string): void {
    const next = new Set(this.state.selected);
    next.add(guid);
    this.setState({ selected: next });
    this.emitter.emit("selection-change", this.getSelected());
  }

  deselect(guid: string): void {
    const next = new Set(this.state.selected);
    next.delete(guid);
    this.setState({ selected: next });
    this.emitter.emit("selection-change", this.getSelected());
  }

  toggleSelect(guid: string): void {
    if (this.state.selected.has(guid)) {
      this.deselect(guid);
    } else {
      this.select(guid);
    }
  }

  selectAll(): void {
    const next = new Set(this.state.entries.map((e) => e.guid));
    this.setState({ selected: next });
    this.emitter.emit("selection-change", this.getSelected());
  }

  deselectAll(): void {
    this.setState({ selected: new Set() });
    this.emitter.emit("selection-change", []);
  }

  getSelected(): StorageEntry[] {
    return this.state.entries.filter((e) => this.state.selected.has(e.guid));
  }

  // ── CRUD ───────────────────────────────────────────────────

  async createFolder(name: string): Promise<void> {
    const folderPath = `${this.state.currentPath.replace(/\/$/, "")}/${name}/`;

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: folderPath }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? `Failed to create folder (${res.status})`);
    }

    await this.refresh();
  }

  async deleteEntry(path: string): Promise<void> {
    this.emitter.emit("delete-start", [path]);

    // Optimistically remove from state
    const objectName = path.replace(/\/$/, "").split("/").pop() ?? "";
    this.setState({
      entries: this.state.entries.filter(
        (e) => !(e.objectName === objectName && path.startsWith(e.path))
      ),
      selected: new Set(
        [...this.state.selected].filter((guid) => {
          const entry = this.state.entries.find((e) => e.guid === guid);
          if (!entry) return false;
          const entryPath = entry.isDirectory
            ? `${entry.path}${entry.objectName}/`
            : `${entry.path}${entry.objectName}`;
          return entryPath !== path;
        })
      ),
    });

    const url = `${this.endpoint}?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      await this.refresh();
      throw new Error(body.error ?? `Failed to delete (${res.status})`);
    }

    this.emitter.emit("delete-complete", [path]);
  }

  async deleteSelected(): Promise<void> {
    const selected = this.getSelected();
    const paths = selected.map((entry) =>
      entry.isDirectory
        ? `${entry.path}${entry.objectName}/`
        : `${entry.path}${entry.objectName}`
    );

    this.emitter.emit("delete-start", paths);

    // Optimistically clear all selected from state
    this.setState({
      entries: this.state.entries.filter(
        (e) => !selected.some((s) => s.guid === e.guid)
      ),
      selected: new Set(),
    });

    // Fire all deletes in parallel
    const results = await Promise.allSettled(
      paths.map((fullPath) => {
        const url = `${this.endpoint}?path=${encodeURIComponent(fullPath)}`;
        return fetch(url, { method: "DELETE" });
      })
    );

    // If any failed, refresh to reconcile
    const hasFailure = results.some((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (hasFailure) {
      await this.refresh();
    }

    this.emitter.emit("delete-complete", paths);
  }

  async importFromUrl(url: string, filename?: string): Promise<void> {
    if (!filename) {
      try {
        const parsed = new URL(url);
        const lastSegment = parsed.pathname.split("/").pop() || "imported-file";
        // Decode in case the URL had encoded characters (e.g. %20 for spaces)
        filename = decodeURIComponent(lastSegment);
      } catch {
        filename = "imported-file";
      }
    }

    const destPath = `${this.state.currentPath.replace(/\/$/, "")}/${filename}`;

    this.emitter.emit("import-start", url, destPath);

    const res = await fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, path: destPath }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const error = new Error(body.error ?? `Failed to import (${res.status})`);
      this.emitter.emit("error", error);
      throw error;
    }

    this.emitter.emit("import-complete", url, destPath);
    await this.refresh();
  }

  downloadUrl(path: string): string {
    return `${this.endpoint}?path=${encodeURIComponent(path)}&download=true`;
  }

  cdnUrl(path: string): string {
    const base = (this.cdnBase ?? "").replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : "/" + path;
    return `${base}${cleanPath}`;
  }

  // ── Custom Actions ─────────────────────────────────────────

  registerAction(action: FileManagerAction): void {
    this.actions.set(action.id, action);
  }

  unregisterAction(id: string): void {
    this.actions.delete(id);
  }

  getActions(entries?: StorageEntry[]): FileManagerAction[] {
    const target = entries ?? this.getSelected();
    const count = target.length;

    return Array.from(this.actions.values()).filter((action) => {
      // Filter by target count
      if (action.target === "single" && count !== 1) return false;
      if (action.target === "multi" && count < 1) return false;
      // "both" allows any count >= 1

      // Filter by applicability
      if (action.isApplicable && !action.isApplicable(target)) return false;

      return true;
    });
  }

  async executeAction(
    actionId: string,
    entries?: StorageEntry[]
  ): Promise<void> {
    const action = this.actions.get(actionId);
    if (!action) throw new Error(`Action "${actionId}" not found`);

    const target = entries ?? this.getSelected();

    const context: ActionContext = {
      fileManager: this,
      cdnBase: this.cdnBase,
    };

    this.emitter.emit("action-start", actionId, target);

    try {
      await action.handler(target, context);
      this.emitter.emit("action-complete", actionId, target);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emitter.emit("error", error);
      throw err;
    }
  }

  // ── Events & lifecycle ─────────────────────────────────────

  on<K extends keyof FileManagerEventMap>(
    event: K,
    fn: FileManagerEventMap[K]
  ): () => void {
    return this.emitter.on(event, fn);
  }

  off<K extends keyof FileManagerEventMap>(
    event: K,
    fn: FileManagerEventMap[K]
  ): void {
    this.emitter.off(event, fn);
  }

  destroy(): void {
    this.emitter.removeAllListeners();
    this.subscribers.clear();
  }
}
