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
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';

const IGNORE = [ '(^|/)\\.internal$' ];
const PIM_STORAGE = 'http://www.w3.org/ns/pim/space#Storage';

function createMapper(root: string): FileIdentifierMapper {
  return {
    async mapUrlToFilePath(identifier: ResourceIdentifier, isMetadata: boolean): Promise<any> {
      const url = new URL(identifier.path);
      const base = join(root, url.pathname);
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
async function expectedWalk(root: string, mapper: FileIdentifierMapper): Promise<number> {
  return (await new DuSizeReporter(mapper, root, IGNORE).getSize({ path: 'http://example.com/alice/' })).amount;
}

// A minimal accessor that stores to the real filesystem and reports
// pim:Storage on the pod root (so pod discovery works).
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
      return meta(identifier.path.endsWith('/') && identifier.path !== 'http://example.com/');
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

const POD = { path: 'http://example.com/alice/' };
const RESOURCE = { path: 'http://example.com/alice/foo' };
const SUB = { path: 'http://example.com/alice/sub/' };
const SUB_RESOURCE = { path: 'http://example.com/alice/sub/bar' };

async function writeDoc(accessor: QuotaDeltaDataAccessor, identifier: ResourceIdentifier, size: number): Promise<void> {
  const stream = (async function* (): AsyncIterableIterator<Buffer> {
    yield Buffer.alloc(size, 1);
  })();
  await accessor.writeDocument(identifier, stream as any, {} as RepresentationMetadata);
}

describe('A QuotaDeltaDataAccessor', (): void => {
  let root: string;
  let counter: QuotaCounter;
  let accessor: QuotaDeltaDataAccessor;

  beforeEach(async(): Promise<void> => {
    root = await fs.mkdtemp(join(tmpdir(), 'delta-'));
    const mapper = createMapper(root);
    const source = createAccessor(root);
    counter = new QuotaCounter(mapper, root, IGNORE);
    accessor = new QuotaDeltaDataAccessor(
      source,
      new SingleRootIdentifierStrategy('http://example.com/'),
      counter,
      mapper,
    );
  });

  afterEach(async(): Promise<void> => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('tracks container creation, writes, overwrites and deletes so the counter ' +
    'equals a real walk.', async(): Promise<void> => {
    await accessor.writeContainer(POD, {} as RepresentationMetadata);
    await writeDoc(accessor, RESOURCE, 100);
    expect((await counter.getSize(POD)).amount).toBe(await expectedWalk(root, createMapper(root)));

    await writeDoc(accessor, RESOURCE, 150);
    expect((await counter.getSize(POD)).amount).toBe(await expectedWalk(root, createMapper(root)));

    await accessor.writeContainer(SUB, {} as RepresentationMetadata);
    await writeDoc(accessor, SUB_RESOURCE, 40);
    expect((await counter.getSize(POD)).amount).toBe(await expectedWalk(root, createMapper(root)));

    await accessor.writeMetadata(RESOURCE, {} as RepresentationMetadata);
    expect((await counter.getSize(POD)).amount).toBe(await expectedWalk(root, createMapper(root)));

    await accessor.deleteResource(RESOURCE);
    expect((await counter.getSize(POD)).amount).toBe(await expectedWalk(root, createMapper(root)));
  });

  it('drops the counter entirely when the pod root itself is deleted.', async(): Promise<void> => {
    await accessor.writeContainer(POD, {} as RepresentationMetadata);
    await writeDoc(accessor, RESOURCE, 50);
    await expect(counter.isPodRoot(POD)).resolves.toBe(true);
    await accessor.deleteResource(POD);
    await expect(counter.isPodRoot(POD)).resolves.toBe(false);
  });

  it('does not track resources outside any pod (no pim:Storage).', async(): Promise<void> => {
    const outside = { path: 'http://example.com/root-file' };
    await writeDoc(accessor, outside, 999);
    await expect(counter.isPodRoot({ path: 'http://example.com/' })).resolves.toBe(false);
    await accessor.deleteResource(outside);
  });

  it('skips delta bookkeeping on internal paths.', async(): Promise<void> => {
    const internal = { path: 'http://example.com/.internal/foo' };
    await writeDoc(accessor, internal, 100);
    await accessor.deleteResource(internal);
    await expect(counter.isPodRoot(POD)).resolves.toBe(false);
  });
});
