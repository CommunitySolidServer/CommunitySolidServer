import { createHash } from 'crypto';
import { ensureDirSync, pathExists, readdir, rmdir } from 'fs-extra';
import type { LockOptions, UnlockOptions } from 'proper-lockfile';
import { lock, unlock } from 'proper-lockfile';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Finalizable } from '../../init/final/Finalizable';
import { getLoggerFor } from '../../logging/LogUtil';
import { createErrorMessage } from '../errors/ErrorUtil';
import { InternalServerError } from '../errors/InternalServerError';
import type { AttemptSettings } from '../LockUtils';
import { retryFunction } from '../LockUtils';
import { joinFilePath } from '../PathUtil';
import type { ResourceLocker } from './ResourceLocker';

const defaultLockOptions: LockOptions = {
  // This must be set to false! If not every lock request will try to resolve the path to the file.
  // Since however this locker maps all locks to a common internal folder that might be non-existing on start,
  // resolving those paths would throw an filesystem error.
  realpath: false,
  /** The number of retries or a [retry](https://www.npmjs.org/package/retry) options object, defaults to 0 */
  retries: 0,
};

const defaultUnlockOptions: UnlockOptions = {
  // This must be set to false! If not every lock request will try to resolve the path to the file.
  // Since however this locker maps all locks to a common internal folder that might be non-existing on start,
  // resolving those paths would throw an filesystem error.
  realpath: false,
};

const attemptDefaults: Required<AttemptSettings> = { retryCount: -1, retryDelay: 50, retryJitter: 30 };

/**
 * Argument interface of the FileSystemResourceLocker constructor.
 */
interface FileSystemResourceLockerArgs {
  /** The rootPath of the filesystem */
  rootFilePath?: string;
  /** The path to the directory where locks will be stored (appended to rootFilePath) */
  lockDirectory?: string;
  /** Custom settings concerning retrying locks */
  attemptSettings?: AttemptSettings;
}

function isCodedError(err: unknown): err is { code: string } & Error {
  return typeof err === 'object' && err !== null && 'code' in err;
}

/**
 * A resource locker making use of the [proper-lockfile](https://www.npmjs.com/package/proper-lockfile) library.
 * Note that no locks are kept in memory, thus this is considered thread- and process-safe.
 *
 * This **proper-lockfile** library has its own retry mechanism for the operations, since a lock/unlock call will
 * either resolve successfully or reject immediately with the causing error. The retry function of the library
 * however will be ignored and replaced by our own LockUtils' {@link retryFunctionUntil} function.
 */
export class FileSystemResourceLocker implements ResourceLocker, Finalizable {
  protected readonly logger = getLoggerFor(this);
  private readonly attemptSettings: Required<AttemptSettings>;
  /** Folder that stores the locks */
  private readonly lockFolder: string;

  /**
   * Create a new FileSystemResourceLocker
   * @param rootFilePath - The rootPath of the filesystem _[default is the current dir `./`]_
   * @param lockDirectory - The path to the directory where locks will be stored (appended to rootFilePath)
                            _[default is `/.internal/locks`]_
   * @param attemptSettings - Custom settings concerning retrying locks
   */
  public constructor(args: FileSystemResourceLockerArgs = {}) {
    const { rootFilePath, lockDirectory, attemptSettings } = args;
    this.attemptSettings = { ...attemptDefaults, ...attemptSettings };
    this.lockFolder = joinFilePath(rootFilePath ?? './', lockDirectory ?? '/.internal/locks');
    ensureDirSync(this.lockFolder);
  }

  /**
   * Wrapper function for all (un)lock operations. Any errors coming from the `fn()` will be swallowed.
   * Only `ENOTACQUIRED` errors wills be thrown (trying to release lock that didn't exist).
   * This wrapper returns undefined because {@link retryFunction} expects that when a retry needs to happne.s
   * @param fn - The function reference to swallow errors from.
   * @returns Boolean or undefined.
   */
  private swallowErrors(fn: () => Promise<unknown>): () => Promise<unknown> {
    return async(): Promise<unknown> => {
      try {
        await fn();
        return true;
      } catch (err: unknown) {
        // Only this error should be thrown
        if (isCodedError(err) && err.code === 'ENOTACQUIRED') {
          throw err;
        }
      }
    };
  }

  public async acquire(identifier: ResourceIdentifier): Promise<void> {
    const { path } = identifier;
    this.logger.debug(`Acquiring lock for ${path}`);
    try {
      const opt = this.generateOptions(identifier, defaultLockOptions);
      await retryFunction(
        this.swallowErrors(lock.bind(null, path, opt)),
        this.attemptSettings,
      );
    } catch (err: unknown) {
      throw new InternalServerError(`Error trying to acquire lock for ${path}. ${createErrorMessage(err)}`);
    }
  }

  public async release(identifier: ResourceIdentifier): Promise<void> {
    const { path } = identifier;
    this.logger.debug(`Releasing lock for ${path}`);
    try {
      const opt = this.generateOptions(identifier, defaultUnlockOptions);
      await retryFunction(
        this.swallowErrors(unlock.bind(null, path, opt)),
        this.attemptSettings,
      );
    } catch (err: unknown) {
      throw new InternalServerError(`Error trying to release lock for ${path}.  ${createErrorMessage(err)}`);
    }
  }

  /**
   * Map the identifier path to a unique path inside the {@link lockFolder}.
   * @param identifier - ResourceIdentifier to generate (Un)LockOptions for.
   * @returns Full path.
   */
  private toLockfilePath(identifier: ResourceIdentifier): string {
    const hash = createHash('md5');
    const { path } = identifier;
    return joinFilePath(this.lockFolder, hash.update(path).digest('hex'));
  }

  /**
 * Generate LockOptions or UnlockOptions depending on the type of defauls given.
 * A custom lockFilePath mapping strategy will be used.
 * @param identifier - ResourceIdentifier to generate (Un)LockOptions for
 * @param defaults - The default options. (lockFilePath will get overwritten)
 * @returns LockOptions or UnlockOptions
 */
  private generateOptions<T>(identifier: ResourceIdentifier, defaults: T): T {
    const lockfilePath = this.toLockfilePath(identifier);
    return {
      ...defaults,
      lockfilePath,
    };
  }

  public async finalize(): Promise<void> {
    // Delete lingering locks in the lockFolder.
    if (await pathExists(this.lockFolder)) {
      for (const dir of await readdir(this.lockFolder)) {
        await rmdir(joinFilePath(this.lockFolder, dir));
      }
      await rmdir(this.lockFolder);
    }
  }
}
