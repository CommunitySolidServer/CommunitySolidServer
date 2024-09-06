import { createHash } from 'node:crypto';
import { ensureDir, remove } from 'fs-extra';
import type { LockOptions, UnlockOptions } from 'proper-lockfile';
import { lock, unlock } from 'proper-lockfile';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { Finalizable } from '../../init/final/Finalizable';
import type { Initializable } from '../../init/Initializable';
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
  /** The root filepath of where the server is allowed to write files */
  rootFilePath: string;
  /**
   * The path to the directory where locks will be stored (relative to rootFilePath)
   * _[default is `/.internal/locks`]_
   */
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
 * While it stores the actual locks on disk, it also tracks them in memory for when they need to be released.
 * This means only the worker thread that acquired a lock can release it again,
 * making this implementation unusable in combination with a wrapping read/write lock implementation.
 *
 * This **proper-lockfile** library has its own retry mechanism for the operations, since a lock/unlock call will
 * either resolve successfully or reject immediately with the causing error. The retry function of the library
 * however will be ignored and replaced by our own LockUtils' {@link retryFunction} function.
 */
export class FileSystemResourceLocker implements ResourceLocker, Initializable, Finalizable {
  protected readonly logger = getLoggerFor(this);
  private readonly attemptSettings: Required<AttemptSettings>;
  private readonly lockOptions: LockOptions;
  /** Folder that stores the locks */
  private readonly lockFolder: string;
  private finalized = false;

  /**
   * Create a new FileSystemResourceLocker
   *
   * @param args - Configures the locker using the specified FileSystemResourceLockerArgs instance.
   */
  public constructor(args: FileSystemResourceLockerArgs) {
    const { rootFilePath, lockDirectory, attemptSettings } = args;
    // Need to create lock options for this instance due to the custom `onCompromised`
    this.lockOptions = { ...defaultLockOptions, onCompromised: this.customOnCompromised.bind(this) };
    this.attemptSettings = { ...attemptDefaults, ...attemptSettings };
    this.lockFolder = joinFilePath(rootFilePath, lockDirectory ?? '/.internal/locks');
  }

  /**
   * Wrapper function for all (un)lock operations. Any errors coming from the `fn()` will be swallowed.
   * Only `ENOTACQUIRED` errors wills be thrown (trying to release lock that didn't exist).
   * This wrapper returns undefined because {@link retryFunction} expects that when a retry needs to happen.
   *
   * @param fn - The function reference to swallow errors from.
   *
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
      const opt = this.generateOptions(identifier, this.lockOptions);
      await retryFunction(
        this.swallowErrors(lock.bind(null, path, opt)),
        this.attemptSettings,
      );
    } catch (err: unknown) {
      throw new InternalServerError(
        `Error trying to acquire lock for ${path}. ${createErrorMessage(err)}`,
        { cause: err },
      );
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
      throw new InternalServerError(
        `Error trying to release lock for ${path}.  ${createErrorMessage(err)}`,
        { cause: err },
      );
    }
  }

  /**
   * Map the identifier path to a unique path inside the {@link lockFolder}.
   *
   * @param identifier - ResourceIdentifier to generate (Un)LockOptions for.
   *
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
   *
   * @param identifier - ResourceIdentifier to generate (Un)LockOptions for
   * @param defaults - The default options. (lockFilePath will get overwritten)
   *
   * @returns LockOptions or UnlockOptions
   */
  private generateOptions<T>(identifier: ResourceIdentifier, defaults: T): T {
    const lockfilePath = this.toLockfilePath(identifier);
    return {
      ...defaults,
      lockfilePath,
    };
  }

  /**
   * Initializer method to be executed on server start. This makes sure that no pre-existing (dangling) locks
   * remain on disk, so that request will not be blocked because a lock was acquired in the previous server instance.
   *
   * NOTE: this also removes locks created by the GreedyReadWriteLocker.
   * (See issue: https://github.com/CommunitySolidServer/CommunitySolidServer/issues/1358)
   */
  public async initialize(): Promise<void> {
    // Remove all existing (dangling) locks so new requests are not blocked (by removing the lock folder).
    await remove(this.lockFolder);
    // Put the folder back since `proper-lockfile` depends on its existence.
    return ensureDir(this.lockFolder);
  }

  public async finalize(): Promise<void> {
    // Register that finalize was called by setting a state variable.
    this.finalized = true;
    // NOTE: in contrast with initialize(), the lock folder is not cleared here, as the proper-lock library
    // manages these files and will attempt to clear existing files when the process is shutdown gracefully.
  }

  /**
   * This function is used to override the proper-lock onCompromised function.
   * Once the locker was finalized, it will log the provided error instead of throwing it
   * This allows for a clean shutdown procedure.
   */
  private customOnCompromised(err: Error): void {
    if (!this.finalized) {
      throw err;
    }
    this.logger.warn(`onCompromised was called with error: ${err.message}`);
  }
}
