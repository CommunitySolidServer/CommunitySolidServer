import type { MinimalAccountSettings } from './AccountStore';
import { ACCOUNT_SETTINGS_REMEMBER_LOGIN } from './AccountStore';
import { GenericAccountStore } from './GenericAccountStore';
import type { AccountLoginStorage } from './LoginStorage';

export const ACCOUNT_STORAGE_DESCRIPTION = {
  [ACCOUNT_SETTINGS_REMEMBER_LOGIN]: 'boolean?',
} as const;

/**
 * A {@link GenericAccountStore} that supports the minimal account settings.
 * Needs to be initialized before it can be used.
 */
export class BaseAccountStore extends GenericAccountStore<MinimalAccountSettings> {
  // Wrong typings to prevent Components.js typing issues
  public constructor(storage: AccountLoginStorage<Record<string, never>>) {
    super(storage, ACCOUNT_STORAGE_DESCRIPTION);
  }
}
