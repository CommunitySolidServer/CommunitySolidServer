/**
 * Allows for initializing state or executing logic when the application is started.
 * Use this interface to add initialization logic to classes that already extend some other type.
 * NOTE: classes without an existing extends-relation should extend from Initializer instead!
 */
export interface Initializable {
  initialize: () => Promise<void>;
}
