/**
 * Lock used by a {@link ResourceLocker} for non-atomic operations.
 */
export interface Lock {
  /**
   * Release this lock.
   * @returns A promise resolving when the release is finished.
   */
  release: () => Promise<void>;
}
