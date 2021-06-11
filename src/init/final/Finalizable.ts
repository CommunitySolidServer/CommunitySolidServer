/**
 * Allows for cleaning up an object and stopping relevant loops when the application needs to be stopped.
 */
export interface Finalizable {
  finalize: () => Promise<void>;
}
