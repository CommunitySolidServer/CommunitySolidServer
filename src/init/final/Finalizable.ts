/**
 * Allows for cleaning up an object and stopping relevant loops when the application needs to be stopped.
 * Use this interface to add finalization logic to classes that already extend some other type.
 * NOTE: classes without an existing extends-relation should extend from Finalizer instead!
 */
export interface Finalizable {
  finalize: () => Promise<void>;
}
