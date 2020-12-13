/**
 * Identity Storage implementations are simple key value stores
 * that will be used to store identity information
 */
export abstract class IdentityStorage {
  abstract get(key: string): Promise<string>;
  abstract set(key: string, value: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
}
