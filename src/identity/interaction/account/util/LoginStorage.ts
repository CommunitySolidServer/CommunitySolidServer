import type {
  IndexedStorage,
  IndexTypeCollection,
  StringKey,
  ValueTypeDescription,
} from '../../../../storage/keyvalue/IndexedStorage';

export const ACCOUNT_TYPE = 'account';

/**
 * A {@link IndexedStorage} where the `defineType` function
 * takes an extra parameter to indicate if the type corresponds to a login method.
 * This is useful for storages that want to add extra requirements based on the data being edited.
 *
 * In practice, we use this because we want to require accounts to have at least 1 login method.
 */
export interface LoginStorage<T extends IndexTypeCollection<T>> extends Omit<IndexedStorage<T>, 'defineType'> {
  /**
   * Defines a type in the storage, just like in an {@link IndexedStorage},
   * but additionally it needs to be indicated if the type corresponds to a login method or not.
   *
   * @param type - Type to define.
   * @param description - Description of the type.
   * @param isLogin - Whether this type corresponds to a login method or not.
   */
  defineType: <TType extends StringKey<T>>(type: TType, description: T[TType], isLogin: boolean) => Promise<void>;
}

/**
 * A {@link LoginStorage} with specific typings to ensure other types can reference account IDs
 * without actually needing to specify it explicitly in their storage type.
 */
export type AccountLoginStorage<T extends
Record<string, Record<string, ValueTypeDescription<keyof T | typeof ACCOUNT_TYPE>>>> =
  LoginStorage<T & { [ACCOUNT_TYPE]: unknown }>;
