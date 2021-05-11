import type { Dirent, Stats } from 'fs';

import { PassThrough } from 'stream';
import streamifyArray from 'streamify-array';
import type { SystemError } from '../../src/util/errors/SystemError';

/* eslint-disable @typescript-eslint/naming-convention */
const portNames = [
  'DynamicPods',
  'Identity',
  'LpdHandlerWithAuth',
  'LpdHandlerWithoutAuth',
  'Middleware',
  'PodCreation',
  'RedisResourceLocker',
  'ServerFetch',
  'SparqlStorage',
  'Subdomains',
  'WebSocketsProtocol',
] as const;

export function getPort(name: typeof portNames[number]): number {
  const idx = portNames.indexOf(name);
  // Just in case something doesn't listen to the typings
  if (idx < 0) {
    throw new Error(`Unknown port name ${name}`);
  }
  return 6000 + idx;
}

export function describeIf(envFlag: string, name: string, fn: () => void): void {
  const flag = `TEST_${envFlag.toUpperCase()}`;
  const enabled = !/^(|0|false)$/iu.test(process.env[flag] ?? '');
  // eslint-disable-next-line jest/valid-describe, jest/valid-title, jest/no-disabled-tests
  return enabled ? describe(name, fn) : describe.skip(name, fn);
}

/**
 * Mocks (some) functions of the fs system library.
 * It is important that you call `jest.mock('fs');` in your test file before calling this!!!
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
export function mockFs(rootFilepath?: string, time?: Date): { data: any } {
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

    const name = parts.slice(-1)[0];
    parts = parts.slice(0, -1);
    let folder = cache.data;
    parts.forEach((part): any => {
      if (typeof folder === 'string') {
        throwSystemError('ENOTDIR');
      }
      folder = folder[part];
      if (!folder) {
        throwSystemError('ENOENT');
      }
    });

    return { folder, name };
  }

  const mock = {
    createReadStream(path: string): any {
      const { folder, name } = getFolder(path);
      return streamifyArray([ folder[name] ]);
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
      lstat(path: string): Stats {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        return {
          isFile: (): boolean => typeof folder[name] === 'string',
          isDirectory: (): boolean => typeof folder[name] === 'object',
          size: typeof folder[name] === 'string' ? folder[name].length : 0,
          mtime: time,
        } as Stats;
      },
      unlink(path: string): void {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        if (!this.lstat(path).isFile()) {
          throwSystemError('EISDIR');
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete folder[name];
      },
      rmdir(path: string): void {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        if (Object.keys(folder[name]).length > 0) {
          throwSystemError('ENOTEMPTY');
        }
        if (!this.lstat(path).isDirectory()) {
          throwSystemError('ENOTDIR');
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete folder[name];
      },
      readdir(path: string): string[] {
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
        for (const child of Object.keys(folder[name])) {
          yield {
            name: child,
            isFile: (): boolean => typeof folder[name][child] === 'string',
            isDirectory: (): boolean => typeof folder[name][child] === 'object',
          } as Dirent;
        }
      },
      mkdir(path: string): void {
        const { folder, name } = getFolder(path);
        if (folder[name]) {
          throwSystemError('EEXIST');
        }
        folder[name] = {};
      },
      readFile(path: string): string {
        const { folder, name } = getFolder(path);
        if (!folder[name]) {
          throwSystemError('ENOENT');
        }
        return folder[name];
      },
      writeFile(path: string, data: string): void {
        const { folder, name } = getFolder(path);
        folder[name] = data;
      },
    },
  };

  const fs = jest.requireMock('fs');
  Object.assign(fs, mock);

  return cache;
}
