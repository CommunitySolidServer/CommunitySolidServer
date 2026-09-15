import { createReadStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { DataAccessor } from '../../../src/storage/accessors/DataAccessor';
import type { FileIdentifierMapper } from '../../../src/storage/mapping/FileIdentifierMapper';
import { QuotaCounter } from '../../../src/storage/quota/QuotaCounter';
import { QuotaDeltaDataAccessor } from '../../../src/storage/quota/QuotaDeltaDataAccessor';
import { DuSizeReporter } from '../../../src/storage/size-reporter/DuSizeReporter';
import { SubdomainIdentifierStrategy } from '../../../src/util/identifiers/SubdomainIdentifierStrategy';

const IGNORE = [ '(^|/)\\.internal$' ];
const PIM_STORAGE = 'http://www.w3.org/ns/pim/space#Storage';
const BASE = 'http://example.com/';
const BASE_HOST = 'example.com';

// Subdomain-aware mapper: http://alice.example.com/foo -> <root>/alice/foo
function createMapper(root: string): FileIdentifierMapper {
  return {
    async mapUrlToFilePath(identifier: ResourceIdentifier, isMetadata: boolean): Promise<any> {
      const url = new URL(identifier.path);
      const host = url.hostname;
      const pod = host === BASE_HOST ? '' : host.slice(0, -(BASE_HOST.length + 1));
      const base = join(root, pod, url.pathname);
      return { identifier, filePath: isMetadata ? `${base}.meta` : base, contentType: undefined, isMetadata };
    },
    async mapFilePathToUrl(): Promise<any> {
      throw new Error('Not implemented');
    },
  };
}

async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Recursive walk — same engine as the counter (du/Node fallback).
async function expectedWalk(root: string, mapper: FileIdentifierMapper, pod: ResourceIdentifier): Promise<number> {
  return (await new DuSizeReporter(mapper, root, IGNORE).getSize(pod)).amount;
}

// A minimal accessor that stores to the real filesystem and reports
// pim:Storage on the subdomain pod root (so pod discovery works).
function meta(isStorage: boolean): RepresentationMetadata {
  return { getAll: (): any[] => isStorage ? [{ value: PIM_STORAGE }] : []} as any;
}

function createAccessor(root: string): DataAccessor {
  const mapper = createMapper(root);

  return {
    async canHandle(): Promise<void> { /* No-op */ },
    async getData(identifier: ResourceIdentifier): Promise<any> {
      const { filePath } = await mapper.mapUrlToFilePath(identifier, false);
      return createReadStream(filePath) as any;
    },
    async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
      return meta(identifier.path.endsWith('/') && identifier.path !== BASE);
    },
    getChildren(): AsyncIterableIterator<any> {
      return (async function* (): AsyncIterableIterator<any> {
        yield* [];
      })();
    },
    async writeDocument(identifier: ResourceIdentifier, data: any): Promise<void> {
      const { filePath } = await mapper.mapUrlToFilePath(identifier, false);
      const buffer = await readStream(data);
      await fs.mkdir(join(filePath, '..'), { recursive: true });
      await fs.writeFile(filePath, buffer);
    },
    async writeContainer(identifier: ResourceIdentifier): Promise<void> {
      const { filePath } = await mapper.mapUrlToFilePath(identifier, false);
      await fs.mkdir(filePath, { recursive: true });
    },
    async writeMetadata(identifier: ResourceIdentifier): Promise<void> {
      const { filePath } = await mapper.mapUrlToFilePath(identifier, true);
      await fs.mkdir(join(filePath, '..'), { recursive: true });
      await fs.writeFile(filePath, '{}');
    },
    async deleteResource(identifier: ResourceIdentifier): Promise<void> {
      const data = await mapper.mapUrlToFilePath(identifier, false);
      const meta = await mapper.mapUrlToFilePath(identifier, true);
      await fs.rm(data.filePath, { recursive: true, force: true });
      await fs.rm(meta.filePath, { force: true });
    },
  };
}

const POD = { path: 'http://alice.example.com/' };
const RESOURCE = { path: 'http://alice.example.com/foo' };

async function writeDoc(accessor: QuotaDeltaDataAccessor, identifier: ResourceIdentifier, size: number): Promise<void> {
  const stream = (async function* (): AsyncIterableIterator<Buffer> {
    yield Buffer.alloc(size, 1);
  })();
  await accessor.writeDocument(identifier, stream as any, {} as RepresentationMetadata);
}

describe('A QuotaDeltaDataAccessor in subdomain mode', (): void => {
  let root: string;
  let counter: QuotaCounter;
  let accessor: QuotaDeltaDataAccessor;

  beforeEach(async(): Promise<void> => {
    root = await fs.mkdtemp(join(tmpdir(), 'delta-sub-'));
    const mapper = createMapper(root);
    const source = createAccessor(root);
    counter = new QuotaCounter(mapper, root, IGNORE);
    accessor = new QuotaDeltaDataAccessor(
      source,
      new SubdomainIdentifierStrategy(BASE),
      counter,
      mapper,
    );
  });

  afterEach(async(): Promise<void> => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('discovers subdomain pod roots and tracks deltas (regression: discovery must ' +
    'read metadata before the root-container stop).', async(): Promise<void> => {
    await accessor.writeContainer(POD, {} as RepresentationMetadata);
    await expect(counter.isPodRoot(POD)).resolves.toBe(true);

    await writeDoc(accessor, RESOURCE, 100);
    expect((await counter.getSize(POD)).amount).toBe(await expectedWalk(root, createMapper(root), POD));

    await writeDoc(accessor, RESOURCE, 150);
    expect((await counter.getSize(POD)).amount).toBe(await expectedWalk(root, createMapper(root), POD));

    const sidecar = join(root, 'alice', '.internal', 'css-quota.json');
    await expect(fs.stat(sidecar)).resolves.toBeTruthy();
  });

  it('does not treat the base root as a pod (writes outside any pod are untracked).', async(): Promise<void> => {
    const baseFile = { path: 'http://example.com/root-file' };
    await writeDoc(accessor, baseFile, 999);
    await expect(counter.isPodRoot({ path: BASE })).resolves.toBe(false);
    await accessor.deleteResource(baseFile);
  });
});
