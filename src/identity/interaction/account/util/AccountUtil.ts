import { getLoggerFor } from '../../../../logging/LogUtil';
import { NotFoundHttpError } from '../../../../util/errors/NotFoundHttpError';
import type { Account } from './Account';
import type { AccountStore } from './AccountStore';
import Dict = NodeJS.Dict;

const logger = getLoggerFor('AccountUtil');

/**
 * Finds the account in the store for the given `accountId`.
 * Throws a {@link NotFoundHttpError} if no account is found.
 *
 * @param accountStore - Account store to look in.
 * @param accountId - Identifier to look up.
 */
export async function getRequiredAccount(accountStore: AccountStore, accountId?: string): Promise<Account> {
  const account = accountId && await accountStore.get(accountId);
  if (!account) {
    logger.debug('Missing account');
    throw new NotFoundHttpError();
  }
  return account;
}

/**
 * Looks for the key in the provided `data` object with `resource` as value.
 * This was designed specifically for working with {@link Account} data where you have a resource
 * but don't know which key it is associated with.
 *
 * @param data - Object to look in.
 * @param resource - The resource URL.
 *
 * @throws A {@link NotFoundHttpError} if no match could be found.
 */
export function ensureResource(data?: Dict<string>, resource?: string): string {
  if (!data || !resource) {
    throw new NotFoundHttpError();
  }
  const token = Object.keys(data).find((key): boolean => data[key] === resource);
  if (!token) {
    logger.debug(`Missing resource ${resource}`);
    throw new NotFoundHttpError();
  }
  return token;
}

/**
 * Adds a login entry for a specific login method to the account data.
 *
 * @param account - {@link Account} to update.
 * @param method - Name of the login method.
 * @param key - Key of the entry.
 * @param resource - Resource associated with the entry.
 */
export function addLoginEntry(account: Account, method: string, key: string, resource: string): void {
  const logins = account.logins[method] ?? {};
  account.logins[method] = logins;
  logins[key] = resource;
}

/**
 * Updates {@link Account} data in such a way to minimize chances of incomplete updates
 * when multiple storages have to be updated simultaneously.
 *
 * First the `accountStore` will be used to update the account, then the `operation` function will be executed.
 * If that latter call fails, the updates done to the account will be reverted.
 * In both success and failure, the result of calling `operation` will be returned.
 *
 * @param account - The account object with the new data. If the `operation` call fails,
 *                  this object will be updated to contain the original account data.
 * @param accountStore - Store used to update the account.
 * @param operation - Function to execute safely.
 */
export async function safeUpdate<T>(account: Account, accountStore: AccountStore, operation: () => Promise<T>):
Promise<T> {
  const oldAccount = await accountStore.get(account.id);
  if (!oldAccount) {
    throw new NotFoundHttpError();
  }

  await accountStore.update(account);
  try {
    return await operation();
  } catch (error: unknown) {
    logger.warn(`Error while updating account ${account.id}, reverting operation.`);
    await accountStore.update(oldAccount);
    // Update the keys of the input `account` variable to make sure it matches what is now stored again.
    // This is relevant if the error thrown here is caught and the account object is still used for some reason.
    Object.assign(account, oldAccount);

    throw error;
  }
}
