import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { joinFilePath, normalizeFilePath } from '../../util/PathUtil';
import type { FileIdentifierMapper } from '../mapping/FileIdentifierMapper';
import type { Size } from '../size-reporter/Size';
import { UNIT_BYTES } from '../size-reporter/Size';
import { DuSizeReporter } from '../size-reporter/DuSizeReporter';

// In-memory counter entry for one pod.
interface CounterEntry {
  total: number;
  valid: boolean;
  podMtimeMs: number;
  /** Epoch ms at which the counter was last known to be correct. */
  updatedAt: number;
}

/**
 * Incremental per-pod byte counter.
 * The counter is a cache; the filesystem is the source of truth.
 */
export class QuotaCounter {
  private readonly fileIdentifierMapper: FileIdentifierMapper;
  private readonly rootFilePath: string;
  private readonly sidecarRelativePath: string;
  private readonly maxAgeMs: number;
  private readonly walker: DuSizeReporter;
  private readonly entries = new Map<string, CounterEntry>();
  private readonly locks = new Map<string, Promise<void>>();

  public constructor(
    fileIdentifierMapper: FileIdentifierMapper,
    rootFilePath: string,
    ignoreFolders: string[] = [],
    sidecarRelativePath = '/.internal/css-quota.json',
    maxAgeMs = 0,
  ) {
    this.fileIdentifierMapper = fileIdentifierMapper;
    this.rootFilePath = normalizeFilePath(rootFilePath);
    this.sidecarRelativePath = sidecarRelativePath;
    this.maxAgeMs = maxAgeMs;
    // Dedicated walker with no cache — every call is a fresh recount.
    this.walker = new DuSizeReporter(fileIdentifierMapper, rootFilePath, ignoreFolders, 0);
  }

  public getUnit(): string {
    return UNIT_BYTES;
  }

  public async getSize(podIdentifier: ResourceIdentifier): Promise<Size> {
    const path = await this.mapDataPath(podIdentifier);
    const entry = await this.ensureEntry(path, podIdentifier);
    return { unit: UNIT_BYTES, amount: entry.total };
  }

  public async register(podIdentifier: ResourceIdentifier): Promise<void> {
    const path = await this.mapDataPath(podIdentifier);
    if (!this.entries.has(path)) {
      this.entries.set(path, { total: 0, valid: false, podMtimeMs: 0, updatedAt: Date.now() });
    }
  }

  public async isPodRoot(identifier: ResourceIdentifier): Promise<boolean> {
    return this.entries.has(await this.mapDataPath(identifier));
  }

  public async add(podIdentifier: ResourceIdentifier, delta: number): Promise<void> {
    const path = await this.mapDataPath(podIdentifier);
    await this.withLock(path, async(): Promise<void> => {
      const entry = this.entries.get(path) ?? { total: 0, valid: false, podMtimeMs: 0, updatedAt: Date.now() };
      entry.total += delta;
      entry.valid = true;
      entry.updatedAt = Date.now();
      this.entries.set(path, entry);
      await this.persistWithMtime(path, entry);
    });
  }

  /** Drops the counter for a pod and removes its sidecar (pod deletion). */
  public async remove(podIdentifier: ResourceIdentifier): Promise<void> {
    const path = await this.mapDataPath(podIdentifier);
    await this.withLock(path, async(): Promise<void> => {
      this.entries.delete(path);
      try {
        await fs.rm(this.sidecarPath(path), { force: true });
      } catch {
        // Best-effort: dropping the in-memory counter is authoritative; a leftover
        // sidecar is detected via pod-root mtime and re-walked on next access.
      }
    });
  }

  public async sizeOfResource(identifier: ResourceIdentifier): Promise<number> {
    const filePath = await this.mapDataPath(identifier);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        return stat.size;
      }
      // Container — walk it (rare: only the overwritten resource is a file).
      return (await this.walker.getSize(identifier)).amount;
    } catch {
      return 0;
    }
  }

  public async mapDataPath(identifier: ResourceIdentifier): Promise<string> {
    const { filePath } = await this.fileIdentifierMapper.mapUrlToFilePath(identifier, false);
    return normalizeFilePath(filePath);
  }

  public async walk(identifier: ResourceIdentifier): Promise<number> {
    return (await this.walker.getSize(identifier)).amount;
  }

  // --- Internals ---

  private async ensureEntry(path: string, podIdentifier: ResourceIdentifier): Promise<CounterEntry> {
    let entry = this.entries.get(path);
    if (this.isFresh(entry)) {
      const mtime = await this.podRootMtime(path);
      if (entry.podMtimeMs === mtime) {
        return entry;
      }
      // Pod root mtime moved — the counter may be stale, recount below.
    }
    // Try the sidecar first (persisted counter), then a full walk.
    return this.withLock(path, async(): Promise<CounterEntry> => {
      entry = this.entries.get(path);
      if (this.isFresh(entry)) {
        const mtime = await this.podRootMtime(path);
        if (entry.podMtimeMs === mtime) {
          return entry;
        }
      }
      const loaded = await this.loadSidecar(path);
      if (this.isFresh(loaded)) {
        const mtime = await this.podRootMtime(path);
        if (loaded.podMtimeMs === mtime) {
          this.entries.set(path, loaded);
          return loaded;
        }
      }
      // No valid counter — full walk (bootstrap / recovery / max-age expiry).
      const total = (await this.walker.getSize(podIdentifier)).amount;
      const fresh: CounterEntry = { total, valid: true, podMtimeMs: 0, updatedAt: Date.now() };
      this.entries.set(path, fresh);
      await this.persistWithMtime(path, fresh);
      return fresh;
    });
  }

  private isFresh(entry: CounterEntry | undefined): entry is CounterEntry {
    return entry !== undefined && entry.valid &&
      (this.maxAgeMs <= 0 || Date.now() - entry.updatedAt < this.maxAgeMs);
  }

  private async podRootMtime(path: string): Promise<number> {
    try {
      const stat = await fs.stat(path);
      return stat.isDirectory() ? stat.mtimeMs : 0;
    } catch {
      return 0;
    }
  }

  private sidecarPath(podRootPath: string): string {
    return normalizeFilePath(joinFilePath(podRootPath, this.sidecarRelativePath));
  }

  private async loadSidecar(path: string): Promise<CounterEntry | undefined> {
    try {
      const raw = await fs.readFile(this.sidecarPath(path), 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' && parsed !== null &&
        'total' in parsed && 'podMtimeMs' in parsed &&
        typeof parsed.total === 'number' && typeof parsed.podMtimeMs === 'number'
      ) {
        // Older sidecars may lack `updatedAt`; treat them as immediately stale
        // so they are refreshed once when a max age is configured.
        let updatedAt = 0;
        if ('updatedAt' in parsed && typeof parsed.updatedAt === 'string') {
          updatedAt = Date.parse(parsed.updatedAt);
          if (!Number.isFinite(updatedAt)) {
            updatedAt = 0;
          }
        }
        return { total: parsed.total, valid: true, podMtimeMs: parsed.podMtimeMs, updatedAt };
      }
    } catch {
      // Missing or malformed sidecar → recount.
    }
    return undefined;
  }

  private async persist(path: string, entry: CounterEntry): Promise<void> {
    const sidecar = this.sidecarPath(path);
    const tmp = `${sidecar}.tmp`;
    try {
      await fs.mkdir(join(path, '.internal'), { recursive: true });
      await fs.writeFile(tmp, JSON.stringify({
        version: 1,
        total: entry.total,
        podMtimeMs: entry.podMtimeMs,
        updatedAt: new Date().toISOString(),
      }));
      await fs.rename(tmp, sidecar);
    } catch {
      // Persistence is best-effort: keep the in-memory counter authoritative.
    }
  }

  private async persistWithMtime(path: string, entry: CounterEntry): Promise<void> {
    await this.persist(path, entry);
    entry.podMtimeMs = await this.podRootMtime(path);
    await this.persist(path, entry);
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let resolveGate: (() => void) | undefined;
    const gate = new Promise<void>((resolve): void => {
      resolveGate = resolve;
    });
    // Waiters chain on `previous`, then wait for this call's `gate` to open.
    const next = previous.then(async(): Promise<void> => {
      await gate;
    });
    this.locks.set(key, next);
    await previous;
    try {
      return await fn();
    } finally {
      resolveGate?.();
      if (this.locks.get(key) === next) {
        this.locks.delete(key);
      }
    }
  }
}
