import type { KeyValueStorage } from './KeyValueStorage';

/* eslint-disable ts/method-signature-style */
/**
 * A KeyValueStorage in which the values can expire.
 * Entries with no expiration date never expire.
 */
export interface ExpiringStorage<TKey, TValue> extends KeyValueStorage<TKey, TValue> {
  /**
   * Sets the value for the given key.
   * Should error if the data is already expired.
   *
   * @param key - Key to set/update.
   * @param value - Value to store.
   * @param expiration - How long this data should stay valid in milliseconds.
   *
   * @returns The storage.
   */
  set(key: TKey, value: TValue, expiration?: number): Promise<this>;

  /**
   * Sets the value for the given key.
   * Should error if the data is already expired.
   *
   * @param key - Key to set/update.
   * @param value - Value to store.
   * @param expires - When this value expires. Never if undefined.
   *
   * @returns The storage.
   */
  set(key: TKey, value: TValue, expires?: Date): Promise<this>;
}
