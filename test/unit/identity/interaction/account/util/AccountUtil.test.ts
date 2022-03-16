import type { Account } from '../../../../../../src/identity/interaction/account/util/Account';
import type { AccountStore } from '../../../../../../src/identity/interaction/account/util/AccountStore';
import {
  addLoginEntry,
  ensureResource,
  getRequiredAccount,
  safeUpdate,
} from '../../../../../../src/identity/interaction/account/util/AccountUtil';
import { NotFoundHttpError } from '../../../../../../src/util/errors/NotFoundHttpError';
import { createAccount, mockAccountStore } from '../../../../../util/AccountUtil';

describe('AccountUtil', (): void => {
  const resource = 'http://example.com/.account/link';
  let account: Account;

  beforeEach(async(): Promise<void> => {
    account = createAccount();
  });

  describe('#getRequiredAccount', (): void => {
    let accountStore: jest.Mocked<AccountStore>;

    beforeEach(async(): Promise<void> => {
      accountStore = mockAccountStore(account);
    });

    it('returns the found account.', async(): Promise<void> => {
      await expect(getRequiredAccount(accountStore, 'id')).resolves.toBe(account);
      expect(accountStore.get).toHaveBeenCalledTimes(1);
      expect(accountStore.get).toHaveBeenLastCalledWith('id');
    });

    it('throws an error if no account was found.', async(): Promise<void> => {
      accountStore.get.mockResolvedValueOnce(undefined);
      await expect(getRequiredAccount(accountStore)).rejects.toThrow(NotFoundHttpError);
    });
  });

  describe('#ensureResource', (): void => {
    const data = {
      'http://example.com/pod/': resource,
      'http://example.com/other-pod/': 'http://example.com/.account/other-link',
    };

    it('returns the matching key.', async(): Promise<void> => {
      expect(ensureResource(data, resource)).toBe('http://example.com/pod/');
    });

    it('throws a 404 if there is no input.', async(): Promise<void> => {
      expect((): any => ensureResource(undefined, resource)).toThrow(NotFoundHttpError);
      expect((): any => ensureResource(data)).toThrow(NotFoundHttpError);
    });

    it('throws a 404 if there is no match.', async(): Promise<void> => {
      expect((): any => ensureResource(data, 'http://example.com/unknown/')).toThrow(NotFoundHttpError);
    });
  });

  describe('#addLoginEntry', (): void => {
    it('adds the login entry.', async(): Promise<void> => {
      addLoginEntry(account, 'method', 'key', 'resource');
      expect(account.logins?.method?.key).toBe('resource');
    });

    it('does not overwrite existing entries.', async(): Promise<void> => {
      account.logins.method = { key: 'resource' };
      addLoginEntry(account, 'method', 'key2', 'resource2');
      expect(account.logins?.method).toEqual({ key: 'resource', key2: 'resource2' });
    });
  });

  describe('#safeUpdate', (): void => {
    const oldAccount: Account = createAccount();
    let accountStore: jest.Mocked<AccountStore>;
    let operation: jest.Mock<Promise<string>, []>;

    beforeEach(async(): Promise<void> => {
      accountStore = mockAccountStore(oldAccount);

      operation = jest.fn().mockResolvedValue('response');
    });

    it('updates the account and calls the operation function.', async(): Promise<void> => {
      account.pods['http://example.com.pod'] = resource;
      await expect(safeUpdate(account, accountStore, operation)).resolves.toBe('response');
      expect(accountStore.get).toHaveBeenCalledTimes(1);
      expect(accountStore.get).toHaveBeenLastCalledWith(account.id);
      expect(accountStore.update).toHaveBeenCalledTimes(1);
      expect(accountStore.update).toHaveBeenLastCalledWith(account);
      expect(operation).toHaveBeenCalledTimes(1);
      expect(account.pods['http://example.com.pod']).toBe(resource);
    });

    it('resets the account data if an error occurs.', async(): Promise<void> => {
      const error = new Error('bad data');
      operation.mockRejectedValueOnce(error);
      await expect(safeUpdate(account, accountStore, operation)).rejects.toThrow(error);
      expect(accountStore.get).toHaveBeenCalledTimes(1);
      expect(accountStore.get).toHaveBeenLastCalledWith(account.id);
      expect(accountStore.update).toHaveBeenCalledTimes(2);
      expect(accountStore.update).toHaveBeenNthCalledWith(1, account);
      expect(accountStore.update).toHaveBeenNthCalledWith(2, oldAccount);
      expect(operation).toHaveBeenCalledTimes(1);
      expect(account.pods).toEqual({});
    });

    it('throws a 404 if the account is unknown.', async(): Promise<void> => {
      accountStore.get.mockResolvedValueOnce(undefined);
      await expect(safeUpdate(account, accountStore, operation)).rejects.toThrow(NotFoundHttpError);
      expect(accountStore.update).toHaveBeenCalledTimes(0);
      expect(operation).toHaveBeenCalledTimes(0);
    });
  });
});
