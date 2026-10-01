import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { FileIdentifierMapper } from '../../../src/storage/mapping/FileIdentifierMapper';
import { IncrementalSizeReporter } from '../../../src/storage/quota/IncrementalSizeReporter';
import { QuotaCounter } from '../../../src/storage/quota/QuotaCounter';

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

const POD = { path: 'http://example.com/alice/' };
const RESOURCE = { path: 'http://example.com/alice/foo' };

describe('An IncrementalSizeReporter', (): void => {
  let root: string;
  let counter: QuotaCounter;
  let reporter: IncrementalSizeReporter;

  beforeEach(async(): Promise<void> => {
    root = await fs.mkdtemp(join(tmpdir(), 'inc-reporter-'));
    await fs.mkdir(join(root, 'alice'));
    counter = new QuotaCounter(createMapper(root), root, IGNORE);
    reporter = new IncrementalSizeReporter(counter);
  });

  afterEach(async(): Promise<void> => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('returns the counter total for a registered pod root.', async(): Promise<void> => {
    await counter.register(POD);
    await counter.add(POD, 123);
    await expect(reporter.getSize(POD)).resolves.toEqual({ unit: 'bytes', amount: 123 });
  });

  it('stats a regular resource (not a pod root).', async(): Promise<void> => {
    await fs.writeFile(join(root, 'alice', 'foo'), Buffer.alloc(64));
    await expect(reporter.getSize(RESOURCE)).resolves.toEqual({ unit: 'bytes', amount: 64 });
  });

  it('returns the byte unit and chunk/content-length helpers.', async(): Promise<void> => {
    expect(reporter.getUnit()).toBe('bytes');
    await expect(reporter.calculateChunkSize(Buffer.alloc(9))).resolves.toBe(9);
    await expect(reporter.estimateSize({ contentLength: 42 } as any)).resolves.toBe(42);
  });

  it('calculates the chunk size for non-buffer chunks.', async(): Promise<void> => {
    await expect(reporter.calculateChunkSize({ length: 5 })).resolves.toBe(5);
    await expect(reporter.calculateChunkSize({})).resolves.toBe(0);
  });
});
