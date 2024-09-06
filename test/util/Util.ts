import type { Dirent, Stats } from 'node:fs';
import { PassThrough, Readable } from 'node:stream';
import type { SystemError } from '../../src/util/errors/SystemError';
import Describe = jest.Describe;

const portNames = [
  // Integration
  'Accounts',
  'AcpServer',
  'Conditions',
  'ContentNegotiation',
  'DynamicPods',
  'ExpiringDataCleanup',
  'FileBackend',
  'GlobalQuota',
  'Identity',
  'LegacyWebSocketsProtocol',
  'LpdHandlerWithAuth',
  'LpdHandlerWithoutAuth',
  'Middleware',
  'N3Patch',
  'PermissionTable',
  'PodCreation',
  'PodQuota',
  'RedisLocker',
  'ResourceLockCleanup',
  'RestrictedIdentity',
  'SeedingPods',
  'ServerFetch',
  'SetupMemory',
  'SparqlStorage',
  'StreamingHTTPChannel2023',
  'Subdomains',
  'WebhookChannel2023',
  'WebhookChannel2023-client',
  'WebSocketChannel2023',

  // Unit
  'BaseServerFactory',
] as const;

// These are ports that are not allowed to change for various reasons
const fixedPorts = {
  V6Migration: 6999,
} as const;

const socketNames = [
  // Unit
  'BaseHttpServerFactory',
];

function isFixedPortName(name: string): name is keyof typeof fixedPorts {
  return Boolean(fixedPorts[name as keyof typeof fixedPorts]);
}

export function getPort(name: typeof portNames[number] | keyof typeof fixedPorts): number {
  if (isFixedPortName(name)) {
    return fixedPorts[name];
  }
  const idx = portNames.indexOf(name);
  // Just in case something doesn't listen to the typings
  if (idx < 0) {
    throw new Error(`Unknown port name ${name}`);
  }
  // 6000 is a bad port, causing node v18+ to block fetch requests targeting such a URL
  // https://fetch.spec.whatwg.org/#port-blocking
  return 6000 + idx + 1;
}

export function getSocket(name: typeof socketNames[number]): string {
  const idx = socketNames.indexOf(name);
  // Just in case something doesn't listen to the typings
  if (idx < 0) {
    throw new Error(`Unknown socket name ${name}`);
  }
  return `css${idx}.sock`;
}

export function describeIf(envFlag: string): Describe {
  const flag = `TEST_${envFlag.toUpperCase()}`;
  const enabled = !/^(?:0|false)?$/iu.test(process.env[flag] ?? '');
  return enabled ? describe : describe.skip;
}

/**
 * This is needed when you want to wait for all promises to resolve.
 * Also works when using jest.useFakeTimers().
 * For more details see the links below
 *  - https://github.com/facebook/jest/issues/2157
 *  - https://stackoverflow.com/questions/52177631/jest-timer-and-promise-dont-work-well-settimeout-and-async-function
 */
export async function flushPromises(): Promise<void> {
  return new Promise(jest.requireActual('timers').setImmediate);
}

/**
 * Compares the contents of the given two maps.
 */
export function compareMaps<TKey, TVal>(map1: Map<TKey, TVal>, map2: Map<TKey, TVal>): void {
  expect(new Set(map1.keys())).toEqual(new Set(map2.keys()));
  // Looping like this also allows us to compare SetMultiMaps
  for (const key of map1.keys()) {
    // Adding key for better error output
    expect({ key, value: map1.get(key) }).toEqual({ key, value: map2.get(key) });
  }
}

/**
 * Mocks (some) functions of the fs system library.
 * It is important that you call `jest.mock('node:fs');` in your test file before calling this!!!
 *
 * This function will return an object of which the `data` field corresponds to the contents of the root folder.
 * The file system can be "reset" by assigning an empty object (`{}`) to the data field.
 *
 * Only files and directories are supported.
 * Files are stored as strings, directories as objects with the keys corresponding to its contents.
 * File path `/folder/folder2/file` will correspond to `data['folder']['folder2']['file']`.
 * This can both be used to check if a file/directory was created,
 * or to specify in advance certain files on the "file system".
 *
 * Data streams will be converted to strings for files by concatenating the contents.
 *
 * @param rootFilepath - The name of the root folder in which fs will start.
 * @param time - The date object to use for time functions (currently only mtime from lstats)
 */
export function mockFileSystem(rootFilepath?: string, time?: Date): { data: any } {
  const cache: { data: any } = { data: {}};

  rootFilepath = rootFilepath ?? 'folder';
  time = time ?? new Date();

  // eslint-disable-next-line unicorn/consistent-function-scoping
  function throwSystemError(code: string): void {
    const error = new Error('error') as SystemError;
    error.code = code;
    error.syscall = 'this exists for isSystemError';
    throw error;
  }

  function getFolder(path: string): { folder: any; name: string } {
    let parts = path.slice(rootFilepath!.length).split('/').filter((part): boolean => part.length > 0);

    if (parts.length === 0) {
      return { folder: cache, name: 'data' };
    }

    const name = parts.at(-1) as string;
    parts = parts.slice(0, -1);
    let folder = cache.data;
    for (const part of parts) {
      if (typeof folder === 'string') {
        throwSystemError('ENOTDIR');
      }
      folder = folder[part];
      if (!folder) {
        throwSystemError('ENOENT');
      }
    }

    return { folder, name };
  }

  const mockFs = {
    createReadStream(path: string): any {
      const { folder, name } = getFolder(path);
      return Readable.from([ folder[name] ]);
    },
    createWriteStream(path: string): any {
      const { folder, name } = getFolder(path);
      folder[name] = '';
      const stream = new PassThrough();
      stream.on('data', (data): any => {
        folder[name] += data;
      });
      stream.on('end', (): any => stream.emit('finish'));
      return stream;
    },
    promises: {
      async stat(path: string): Promise<Stats> {
        return this.lstat(await this.realpath(path));
      },
      async lstat(path: string): Promise<Stats> {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        return {
          isFile: (): boolean => typeof folder[name] === 'string',
          isDirectory: (): boolean => typeof folder[name] === 'object',
          isSymbolicLink: (): boolean => typeof folder[name] === 'symbol',
          size: typeof folder[name] === 'string' ? folder[name].length : 4,
          mtime: time,
        } as Stats;
      },
      async unlink(path: string): Promise<void> {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        if (!(await this.lstat(path)).isFile()) {
          throwSystemError('EISDIR');
        }
        delete folder[name];
      },
      async symlink(target: string, path: string): Promise<void> {
        const { folder, name } = getFolder(path);
        folder[name] = Symbol(target);
      },
      async realpath(path: string): Promise<string> {
        const { folder, name } = getFolder(path);
        const entry = folder[name];
        return typeof entry === 'symbol' ? entry.description ?? 'invalid' : path;
      },
      async rm(path: string): Promise<void> {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        if (Object.keys(folder[name]).length > 0) {
          throwSystemError('ENOTEMPTY');
        }
        if (!(await this.lstat(path)).isDirectory()) {
          throwSystemError('ENOTDIR');
        }
        delete folder[name];
      },
      async readdir(path: string): Promise<string[]> {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        return Object.keys(folder[name]);
      },
      async* opendir(path: string): AsyncIterableIterator<Dirent> {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        for (const [ child, entry ] of Object.entries(folder[name])) {
          yield {
            name: child,
            isFile: (): boolean => typeof entry === 'string',
            isDirectory: (): boolean => typeof entry === 'object',
            isSymbolicLink: (): boolean => typeof entry === 'symbol',
          } as Dirent;
        }
      },
      async mkdir(path: string): Promise<void> {
        const { folder, name } = getFolder(path);
        if (folder[name]) {
          throwSystemError('EEXIST');
        }
        folder[name] = {};
      },
      async readFile(path: string): Promise<string> {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        return folder[name];
      },
      async writeFile(path: string, data: string): Promise<void> {
        const { folder, name } = getFolder(path);
        folder[name] = data;
      },
      async rename(path: string, destination: string): Promise<void> {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        if (!(await this.lstat(path)).isFile()) {
          throwSystemError('EISDIR');
        }

        const { folder: folderDest, name: nameDest } = getFolder(destination);
        folderDest[nameDest] = folder[name];

        delete folder[name];
      },
    },
  };

  const mockFsExtra = {
    async readJson(path: string): Promise<NodeJS.Dict<unknown>> {
      const { folder, name } = getFolder(path);
      if (!folder[name]) {
        throwSystemError('ENOENT');
      }
      return JSON.parse(folder[name]);
    },
    async writeJson(path: string, json: NodeJS.Dict<unknown>): Promise<void> {
      const { folder, name } = getFolder(path);
      const data = JSON.stringify(json, null, 2);
      folder[name] = data;
    },
    async ensureDir(path: string): Promise<void> {
      const { folder, name } = getFolder(path);
      folder[name] = {};
    },
    async remove(path: string): Promise<void> {
      const { folder, name } = getFolder(path);
      delete folder[name];
    },
    async pathExists(path: string): Promise<boolean> {
      try {
        const { folder, name } = getFolder(path);
        return Boolean(folder[name]);
      } catch {
        return false;
      }
    },
    createReadStream(path: string): any {
      return mockFs.createReadStream(path);
    },
    createWriteStream(path: string): any {
      return mockFs.createWriteStream(path);
    },
    async realpath(path: string): Promise<string> {
      return mockFs.promises.realpath(path);
    },
    async stat(path: string): Promise<Stats> {
      return mockFs.promises.lstat(await mockFs.promises.realpath(path));
    },
    async lstat(path: string): Promise<Stats> {
      return mockFs.promises.lstat(path);
    },
    async unlink(path: string): Promise<void> {
      await mockFs.promises.unlink(path);
    },
    async symlink(target: string, path: string): Promise<void> {
      await mockFs.promises.symlink(target, path);
    },
    async rm(path: string): Promise<void> {
      await mockFs.promises.rm(path);
    },
    async readdir(path: string): Promise<string[]> {
      return mockFs.promises.readdir(path);
    },
    async* opendir(path: string): AsyncIterableIterator<Dirent> {
      for await (const entry of mockFs.promises.opendir(path)) {
        yield entry;
      }
    },
    async mkdir(path: string): Promise<void> {
      await mockFs.promises.mkdir(path);
    },
    async readFile(path: string): Promise<string> {
      return mockFs.promises.readFile(path);
    },
    async writeFile(path: string, data: string): Promise<void> {
      await mockFs.promises.writeFile(path, data);
    },
    async rename(path: string, destination: string): Promise<void> {
      await mockFs.promises.rename(path, destination);
    },
  };

  const fs = jest.requireMock('node:fs');
  Object.assign(fs, mockFs);

  const fsExtra = jest.requireMock('fs-extra');
  Object.assign(fsExtra, mockFsExtra);

  return cache;
}
