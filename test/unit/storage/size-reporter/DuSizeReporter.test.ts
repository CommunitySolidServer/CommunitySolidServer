import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { FileIdentifierMapper } from '../../../../src/storage/mapping/FileIdentifierMapper';
import type { Size } from '../../../../src/storage/size-reporter/Size';
import { DuSizeReporter } from '../../../../src/storage/size-reporter/DuSizeReporter';

// Wrap the real execFile so individual tests can simulate du successes and failures
// (this keeps the tests platform-independent: with and without a real du binary).
jest.mock('node:child_process', (): any => {
  const actual = jest.requireActual('node:child_process');
  return { ...actual, execFile: jest.fn(actual.execFile) };
});

// Force the du-based path (works even where du is absent — the Node walk
// produces the same apparent-byte sum for a simple tree).
class ForceDuReporter extends DuSizeReporter {
  protected override async detectDu(): Promise<'gnu' | 'bsd' | 'none'> {
    return 'gnu';
  }
}

// Force the Node-walk fallback path.
class ForceNodeReporter extends DuSizeReporter {
  protected override async detectDu(): Promise<'gnu' | 'bsd' | 'none'> {
    return 'none';
  }
}

function createMapper(root: string): FileIdentifierMapper {
  return {
    async mapUrlToFilePath(identifier: ResourceIdentifier): Promise<any> {
      const url = new URL(identifier.path);
      return { identifier, filePath: join(root, url.pathname), contentType: undefined, isMetadata: false };
    },
    async mapFilePathToUrl(): Promise<any> {
      throw new Error('Not implemented');
    },
  };
}

describe('A DuSizeReporter', (): void => {
  let root: string;
  let mapper: FileIdentifierMapper;

  beforeEach(async(): Promise<void> => {
    root = await fs.mkdtemp(join(tmpdir(), 'du-size-reporter-'));
    mapper = createMapper(root);
    jest.mocked(execFile).mockClear();
  });

  afterEach(async(): Promise<void> => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('returns the apparent size of a file.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    const size = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(size).toEqual({ unit: 'bytes', amount: 100 });
  });

  it('reports the same size whether du or the Node fallback is used.', async(): Promise<void> => {
    await fs.mkdir(join(root, 'dir'));
    await fs.writeFile(join(root, 'dir', 'a.txt'), Buffer.alloc(100));
    await fs.writeFile(join(root, 'dir', 'b.txt'), Buffer.alloc(50));
    const viaDu = await new ForceDuReporter(mapper, root).getSize({ path: 'http://example.com/dir/a.txt' });
    const viaNode = await new ForceNodeReporter(mapper, root).getSize({ path: 'http://example.com/dir/a.txt' });
    expect(viaDu.amount).toBe(100);
    expect(viaNode.amount).toBe(100);
  });

  it('serves a cached result within the TTL window without re-walking.', async(): Promise<void> => {
    const reporter = new ForceDuReporter(mapper, root, [], 60_000);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    const first = await reporter.getSize({ path: 'http://example.com/a.txt' });
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(200));
    const cached = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(first.amount).toBe(100);
    expect(cached.amount).toBe(100);
  });

  it('recomputes after invalidation.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root, [], 60_000);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    await reporter.getSize({ path: 'http://example.com/a.txt' });
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(200));
    await reporter.invalidate({ path: 'http://example.com/a.txt' });
    const after = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(after.amount).toBe(200);
  });

  it('invalidates ancestor entries (e.g. the pod root) as well.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root, [], 60_000);
    await fs.mkdir(join(root, 'dir'));
    await fs.writeFile(join(root, 'dir', 'a.txt'), Buffer.alloc(100));
    const rootSize = await reporter.getSize({ path: 'http://example.com/' });
    expect(rootSize.amount).toBeGreaterThanOrEqual(100);
    await fs.writeFile(join(root, 'dir', 'a.txt'), Buffer.alloc(300));
    await reporter.invalidate({ path: 'http://example.com/dir/a.txt' });
    const newRootSize = await reporter.getSize({ path: 'http://example.com/' });
    expect(newRootSize.amount).toBe(rootSize.amount + 200);
  });

  it('excludes the ignoreFolders from the total.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root, [ '^/\\.internal$' ]);
    await fs.mkdir(join(root, '.internal'));
    await fs.writeFile(join(root, '.internal', 'x.txt'), Buffer.alloc(1000));
    const without = await reporter.getSize({ path: 'http://example.com/' });
    // Adding a file inside .internal must not change the reported size.
    await fs.writeFile(join(root, '.internal', 'y.txt'), Buffer.alloc(1000));
    await reporter.invalidate({ path: 'http://example.com/' });
    const still = await reporter.getSize({ path: 'http://example.com/' });
    expect(still.amount).toBe(without.amount);
    // Adding a normal file must increase it.
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(50));
    await reporter.invalidate({ path: 'http://example.com/' });
    const increased = await reporter.getSize({ path: 'http://example.com/' });
    expect(increased.amount).toBe(without.amount + 50);
  });

  it('returns the content-length as the estimated size.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root);
    await expect(reporter.estimateSize({ contentLength: 42 } as any)).resolves.toBe(42);
    await expect(reporter.estimateSize({} as any)).resolves.toBeUndefined();
  });

  it('calculates the chunk size as the buffer length.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root);
    await expect(reporter.calculateChunkSize(Buffer.alloc(17))).resolves.toBe(17);
  });

  it('calculates the chunk size for non-buffer chunks.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root);
    await expect(reporter.calculateChunkSize({ length: 5 })).resolves.toBe(5);
    await expect(reporter.calculateChunkSize({})).resolves.toBe(0);
  });

  it('returns the byte unit.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root);
    expect(reporter.getUnit()).toBe('bytes');
  });

  it('reports a size of 0 for a missing resource.', async(): Promise<void> => {
    const reporter = new DuSizeReporter(mapper, root);
    const size: Size = await reporter.getSize({ path: 'http://example.com/nope' });
    expect(size.amount).toBe(0);
  });

  it('parses du output and passes the ignore folders as exclude patterns.', async(): Promise<void> => {
    jest.mocked(execFile).mockImplementationOnce(
      (command: string, args: any, options: any, callback: any): any => {
        expect(command).toBe('du');
        expect(args).toContain('--exclude');
        expect(args).toContain('.internal');
        callback(null, { stdout: '123\t/path\n', stderr: '' });
      },
    );
    const reporter = new ForceDuReporter(mapper, root, [ '^/\\.internal$', '(^|/)\\.internal$' ]);
    const size = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(size.amount).toBe(123);
  });

  it('falls back to the Node walk when du output cannot be parsed.', async(): Promise<void> => {
    jest.mocked(execFile).mockImplementationOnce(
      (command: string, args: any, options: any, callback: any): any => {
        callback(null, { stdout: 'garbage output\n', stderr: '' });
      },
    );
    const reporter = new ForceDuReporter(mapper, root);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    const size = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(size.amount).toBe(100);
  });

  it('falls back to the Node walk when du fails.', async(): Promise<void> => {
    jest.mocked(execFile).mockImplementationOnce(
      (command: string, args: any, options: any, callback: any): any => {
        callback(new Error('du failed'));
      },
    );
    const reporter = new ForceDuReporter(mapper, root);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    const size = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(size.amount).toBe(100);
  });

  it('detects GNU du when --version succeeds.', async(): Promise<void> => {
    jest.mocked(execFile)
      .mockImplementationOnce((command: string, args: any, options: any, callback: any): any => {
        callback(null, { stdout: 'du (GNU coreutils) 9.1\n', stderr: '' });
      })
      .mockImplementationOnce((command: string, args: any, options: any, callback: any): any => {
        callback(null, { stdout: '100\t/path\n', stderr: '' });
      });
    const reporter = new DuSizeReporter(mapper, root);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    const size = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(size.amount).toBe(100);
  });

  it('detects no du when the command is missing and caches the flavor.', async(): Promise<void> => {
    jest.mocked(execFile).mockImplementationOnce(
      (command: string, args: any, options: any, callback: any): any => {
        callback(Object.assign(new Error('missing'), { code: 'ENOENT' }));
      },
    );
    const reporter = new DuSizeReporter(mapper, root);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    await fs.writeFile(join(root, 'b.txt'), Buffer.alloc(50));
    expect((await reporter.getSize({ path: 'http://example.com/a.txt' })).amount).toBe(100);
    // The second resource reuses the cached flavor without probing du again.
    expect((await reporter.getSize({ path: 'http://example.com/b.txt' })).amount).toBe(50);
    expect(execFile).toHaveBeenCalledTimes(1);
  });

  it('assumes BSD when --version fails for another reason.', async(): Promise<void> => {
    jest.mocked(execFile)
      .mockImplementationOnce((command: string, args: any, options: any, callback: any): any => {
        callback(Object.assign(new Error('denied'), { code: 'EACCES' }));
      })
      .mockImplementationOnce((command: string, args: any, options: any, callback: any): any => {
        // BSD flags are used; make the call fail so the Node walk takes over.
        expect(args[0]).toBe('-s');
        expect(args).toContain('-A');
        expect(args).toContain('-I');
        expect(args).toContain('.internal');
        callback(new Error('bsd failed'));
      });
    const reporter = new DuSizeReporter(mapper, root, [ '^/\\.internal$' ]);
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    const size = await reporter.getSize({ path: 'http://example.com/a.txt' });
    expect(size.amount).toBe(100);
  });

  it('walks directories recursively with the Node fallback, honoring ignoreFolders.', async(): Promise<void> => {
    const reporter = new ForceNodeReporter(mapper, root, [ '^/\\.internal$' ]);
    await fs.mkdir(join(root, 'sub'), { recursive: true });
    await fs.writeFile(join(root, 'a.txt'), Buffer.alloc(100));
    await fs.writeFile(join(root, 'sub', 'b.txt'), Buffer.alloc(50));
    await fs.mkdir(join(root, '.internal'));
    await fs.writeFile(join(root, '.internal', 'x.txt'), Buffer.alloc(1000));
    const withIgnore = await reporter.getSize({ path: 'http://example.com/' });
    const withoutIgnore = await new ForceNodeReporter(mapper, root).getSize({ path: 'http://example.com/' });
    // The ignored .internal content is excluded and the visible files are counted.
    expect(withIgnore.amount).toBeLessThan(withoutIgnore.amount);
    expect(withIgnore.amount).toBeGreaterThanOrEqual(150);
  });
});
