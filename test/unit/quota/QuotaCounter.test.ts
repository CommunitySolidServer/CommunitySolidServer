import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { FileIdentifierMapper } from '../../../src/storage/mapping/FileIdentifierMapper';
import { QuotaCounter } from '../../../src/storage/quota/QuotaCounter';
import { DuSizeReporter } from '../../../src/storage/size-reporter/DuSizeReporter';

const IGNORE = [ '(^|/)\\.internal$' ];

function createMapper(root: string): FileIdentifierMapper {
  return {
    async mapUrlToFilePath(identifier: ResourceIdentifier, isMetadata: boolean): Promise<any> {
      const url = new URL(identifier.path);
      const base = join(root, url.pathname);
      return {
        identifier,
        filePath: isMetadata ? `${base}.meta` : base,
        contentType: undefined,
        isMetadata,
      };
    },
    async mapFilePathToUrl(): Promise<any> {
      throw new Error('Not implemented');
    },
  };
}

// The same walk engine the counter uses for recounts.
async function expectedWalk(root: string, mapper: FileIdentifierMapper, pod: ResourceIdentifier): Promise<number> {
  return (await new DuSizeReporter(mapper, root, IGNORE).getSize(pod)).amount;
}

const POD = { path: 'http://example.com/alice/' };
const RESOURCE = { path: 'http://example.com/alice/foo' };

describe('A QuotaCounter', (): void => {
  let root: string;
  let mapper: FileIdentifierMapper;

  beforeEach(async(): Promise<void> => {
    root = await fs.mkdtemp(join(tmpdir(), 'quota-counter-'));
    await fs.mkdir(join(root, 'alice'));
    mapper = createMapper(root);
  });

  afterEach(async(): Promise<void> => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('accumulates deltas and returns the total (O(1)).', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await counter.register(POD);
    await counter.add(POD, 100);
    await counter.add(POD, 50);
    await expect(counter.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 150 });
  });

  it('bootstraps by walking when no counter or sidecar exists.', async(): Promise<void> => {
    await fs.writeFile(join(root, 'alice', 'a.txt'), Buffer.alloc(120));
    const counter = new QuotaCounter(mapper, root, IGNORE);
    const size = await counter.getSize(POD);
    expect(size.amount).toBe(await expectedWalk(root, mapper, POD));
    expect(size.amount).toBeGreaterThanOrEqual(120);
  });

  it('persists the sidecar and reloads it on a fresh instance (no re-walk).', async(): Promise<void> => {
    const first = new QuotaCounter(mapper, root, IGNORE);
    await first.register(POD);
    await first.add(POD, 200);
    // Fresh counter — same pod, sidecar matches mtime → loaded, no walk.
    const second = new QuotaCounter(mapper, root, IGNORE);
    await expect(second.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 200 });
  });

  it('detects staleness (out-of-band change) and recounts.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await counter.register(POD);
    await counter.add(POD, 100);
    // Out-of-band change: a direct child appears in the pod root. Some filesystems
    // (e.g. NTFS mounted via WSL) have coarse directory mtime granularity, so the
    // new child may not bump the root mtime immediately; force it to a clearly
    // different value to make the staleness detection deterministic.
    await fs.writeFile(join(root, 'alice', 'extra.bin'), Buffer.alloc(400));
    const oldTime = new Date(2000, 0, 1);
    await fs.utimes(join(root, 'alice'), oldTime, oldTime);
    const size = await counter.getSize(POD);
    expect(size.amount).toBe(await expectedWalk(root, mapper, POD));
    expect(size.amount).toBeGreaterThanOrEqual(400);
  });

  it('does not recount while the counter is within the max age.', async(): Promise<void> => {
    const first = new QuotaCounter(mapper, root, IGNORE, undefined, 3_600_000);
    await first.register(POD);
    await first.add(POD, 200);
    // A fresh instance loads the sidecar (still within the max age) without a walk.
    const second = new QuotaCounter(mapper, root, IGNORE, undefined, 3_600_000);
    await expect(second.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 200 });
  });

  it('recounts after the max age even when the pod root mtime did not ' +
    'change (deep change).', async(): Promise<void> => {
    // A deep file added after the counter was persisted does not bump the pod root
    // mtime — only the max-age expiry forces the recount.
    await fs.mkdir(join(root, 'alice', 'sub'), { recursive: true });
    const first = new QuotaCounter(mapper, root, IGNORE, undefined, 3_600_000);
    await first.register(POD);
    await first.add(POD, 200);
    // Out-of-band deep change: only `sub`'s mtime changes, not the pod root's.
    await fs.writeFile(join(root, 'alice', 'sub', 'deep.bin'), Buffer.alloc(400));
    // Age the sidecar beyond the max age.
    const sidecarPath = join(root, 'alice', '.internal', 'css-quota.json');
    const raw = JSON.parse(await fs.readFile(sidecarPath, 'utf8'));
    raw.updatedAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
    await fs.writeFile(sidecarPath, JSON.stringify(raw));
    // A fresh instance sees the expired sidecar and re-walks.
    const second = new QuotaCounter(mapper, root, IGNORE, undefined, 3_600_000);
    const size = await second.getSize(POD);
    expect(size.amount).toBe(await expectedWalk(root, mapper, POD));
    expect(size.amount).toBeGreaterThanOrEqual(400);
  });

  it('returns the size of a single resource via stat.', async(): Promise<void> => {
    await fs.writeFile(join(root, 'alice', 'foo'), Buffer.alloc(77));
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await expect(counter.sizeOfResource(RESOURCE)).resolves.toBe(77);
  });

  it('returns 0 for a missing resource.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await expect(counter.sizeOfResource(RESOURCE)).resolves.toBe(0);
  });

  it('drops the entry and sidecar on remove, then bootstraps again.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await counter.register(POD);
    await counter.add(POD, 100);
    await counter.remove(POD);
    await expect(counter.isPodRoot(POD)).resolves.toBe(false);
    // The sidecar is gone and the counter is dropped → next read re-walks.
    const size = await counter.getSize(POD);
    expect(size.amount).toBe(await expectedWalk(root, mapper, POD));
  });

  it('serializes concurrent adds with a per-pod lock.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await counter.register(POD);
    await Promise.all([ counter.add(POD, 10), counter.add(POD, 20), counter.add(POD, 30) ]);
    await expect(counter.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 60 });
  });

  it('returns the byte unit.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    expect(counter.getUnit()).toBe('bytes');
  });

  it('accepts the default ignoreFolders and sidecar path.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root);
    await counter.register(POD);
    await counter.add(POD, 50);
    await expect(counter.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 50 });
  });

  it('creates the entry on add when the pod was not registered first.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    // No register() call — add() must create the entry itself.
    await counter.add(POD, 75);
    await expect(counter.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 75 });
  });

  it('records a zero mtime when the pod root is a file.', async(): Promise<void> => {
    const pod = { path: 'http://example.com/alice' };
    await fs.rm(join(root, 'alice'), { recursive: true, force: true });
    await fs.writeFile(join(root, 'alice'), Buffer.alloc(10));
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await counter.register(pod);
    await counter.add(pod, 100);
    await expect(counter.getSize(pod)).resolves.toEqual({ unit: 'bytes', amount: 100 });
  });

  it('walks containers in sizeOfResource and exposes walk().', async(): Promise<void> => {
    await fs.mkdir(join(root, 'alice', 'dir'), { recursive: true });
    await fs.writeFile(join(root, 'alice', 'dir', 'file.bin'), Buffer.alloc(50));
    const counter = new QuotaCounter(mapper, root, IGNORE);
    const container = { path: 'http://example.com/alice/dir/' };
    const expected = await expectedWalk(root, mapper, container);
    await expect(counter.sizeOfResource(container)).resolves.toBe(expected);
    await expect(counter.walk(container)).resolves.toBe(expected);
  });

  it('returns 0 for a deleted pod root when checking staleness.', async(): Promise<void> => {
    const counter = new QuotaCounter(mapper, root, IGNORE);
    await counter.register(POD);
    await counter.add(POD, 100);
    // Pod root removed out-of-band → the mtime stat fails, the counter is stale
    // and the follow-up walk finds nothing.
    await fs.rm(join(root, 'alice'), { recursive: true, force: true });
    await expect(counter.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 0 });
  });

  it('serializes concurrent getSize calls so only one walk happens.', async(): Promise<void> => {
    await fs.writeFile(join(root, 'alice', 'a.txt'), Buffer.alloc(120));
    const counter = new QuotaCounter(mapper, root, IGNORE);
    const [ first, second ] = await Promise.all([ counter.getSize(POD), counter.getSize(POD) ]);
    expect(first.amount).toBe(second.amount);
    expect(first.amount).toBe(await expectedWalk(root, mapper, POD));
  });

  it('treats a sidecar without updatedAt as stale when a max age is set.', async(): Promise<void> => {
    const first = new QuotaCounter(mapper, root, IGNORE);
    await first.register(POD);
    await first.add(POD, 200);
    const sidecarPath = join(root, 'alice', '.internal', 'css-quota.json');
    const raw = JSON.parse(await fs.readFile(sidecarPath, 'utf8'));
    delete raw.updatedAt;
    await fs.writeFile(sidecarPath, JSON.stringify(raw));
    // The stored total (200) is not trusted: the missing date is treated as stale
    // and the real (empty) pod is re-walked instead.
    const second = new QuotaCounter(mapper, root, IGNORE, undefined, 3_600_000);
    const size = await second.getSize(POD);
    expect(size.amount).toBe(await expectedWalk(root, mapper, POD));
  });

  it('treats a sidecar with an unparseable updatedAt as stale.', async(): Promise<void> => {
    const first = new QuotaCounter(mapper, root, IGNORE);
    await first.register(POD);
    await first.add(POD, 200);
    const sidecarPath = join(root, 'alice', '.internal', 'css-quota.json');
    const raw = JSON.parse(await fs.readFile(sidecarPath, 'utf8'));
    raw.updatedAt = 'not-a-date';
    await fs.writeFile(sidecarPath, JSON.stringify(raw));
    // The unparseable date is treated as stale and the pod is re-walked.
    const second = new QuotaCounter(mapper, root, IGNORE, undefined, 3_600_000);
    const size = await second.getSize(POD);
    expect(size.amount).toBe(await expectedWalk(root, mapper, POD));
  });
});
