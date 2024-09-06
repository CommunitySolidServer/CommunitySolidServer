import { getLoggerFor } from '../../../../logging/LogUtil';
import type {
  CreateTypeObject,
  IndexedQuery,
  IndexedStorage,
  IndexTypeCollection,
  StringKey,
  TypeObject,
  ValueType,
} from '../../../../storage/keyvalue/IndexedStorage';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../../../../util/errors/NotFoundHttpError';
import type { LoginStorage } from './LoginStorage';
import { ACCOUNT_TYPE } from './LoginStorage';

const LOGIN_COUNT = 'linkedLoginsCount';

const MINIMUM_ACCOUNT_DESCRIPTION = {
  [LOGIN_COUNT]: 'number',
} as const;

/**
 * A {@link LoginStorage} that wraps around another {@link IndexedStorage} to add specific account requirements.
 *   * New accounts will be removed after expiration time, in seconds, default is 1800,
 *     if no login method was added to them in that time.
 *   * Non-login types can not be created until the associated account has at least 1 login method.
 *   * Login types can not be deleted if they are the last login of the associated account.
 *
 * All of this is tracked by adding a new field to the account object,
 * that keeps track of how many login objects are associated with the account.
 */
export class BaseLoginAccountStorage<T extends IndexTypeCollection<T>> implements LoginStorage<T> {
  private readonly logger = getLoggerFor(this);

  protected readonly loginTypes: string[];
  protected readonly storage: IndexedStorage<T>;
  private readonly expiration: number;
  protected readonly accountKeys: NodeJS.Dict<string>;

  public constructor(storage: IndexedStorage<T>, expiration = 30 * 60) {
    this.loginTypes = [];
    this.storage = storage;
    this.expiration = expiration * 1000;
    this.accountKeys = {};
  }

  public async defineType<TType extends StringKey<T>>(type: TType, description: T[TType], isLogin: boolean):
  Promise<void> {
    // Determine potential new key pointing to account ID
    this.accountKeys[type] = Object.entries(description)
      .find(([ , desc ]): boolean => desc === `id:${ACCOUNT_TYPE}` as `id:${string & keyof T}`)?.[0];

    if (type === ACCOUNT_TYPE) {
      description = { ...description, ...MINIMUM_ACCOUNT_DESCRIPTION };
    }

    if (isLogin) {
      this.loginTypes.push(type);
    }

    return this.storage.defineType(type, description);
  }

  public async createIndex<TType extends StringKey<T>>(type: TType, key: StringKey<T[TType]>): Promise<void> {
    return this.storage.createIndex(type, key);
  }

  public async create<TType extends StringKey<T>>(type: TType, value: CreateTypeObject<T[TType]>):
  Promise<TypeObject<T[TType]>> {
    // Check login count if it is not a new login method that we are trying to add,
    // to make sure the account is already valid.
    // If we are adding a new login method: increase the login counter by 1.
    const accountKey = this.accountKeys[type];
    if (accountKey) {
      const accountId = value[accountKey] as string;
      await this.checkAccount(type, accountId, true);
    }

    if (type === ACCOUNT_TYPE) {
      value = { ...value, [LOGIN_COUNT]: 0 };
    }

    const result = await this.storage.create(type, value);

    if (type === ACCOUNT_TYPE) {
      this.createAccountTimeout(result.id);
    }

    return this.cleanOutput(result);
  }

  public async has<TType extends StringKey<T>>(type: TType, id: string): Promise<boolean> {
    return this.storage.has(type, id);
  }

  public async get<TType extends StringKey<T>>(type: TType, id: string): Promise<TypeObject<T[TType]> | undefined> {
    return this.cleanOutput(await this.storage.get(type, id));
  }

  public async find<TType extends StringKey<T>>(type: TType, query: IndexedQuery<T, TType>):
  Promise<TypeObject<T[TType]>[]> {
    return (await this.storage.find(type, query)).map(this.cleanOutput);
  }

  public async findIds<TType extends StringKey<T>>(type: TType, query: IndexedQuery<T, TType>): Promise<string[]> {
    return this.storage.findIds(type, query);
  }

  public async set<TType extends StringKey<T>>(type: TType, value: TypeObject<T[TType]>): Promise<void> {
    if (type === ACCOUNT_TYPE) {
      // Get login count from original object
      const original = await this.storage.get(type, value.id);
      if (!original) {
        throw new NotFoundHttpError();
      }
      // This makes sure we don't lose the login count
      value = { ...value, [LOGIN_COUNT]: original[LOGIN_COUNT] };
    }

    return this.storage.set(type, value);
  }

  public async setField<TType extends StringKey<T>, TKey extends StringKey<T[TType]>>(
    type: TType,
    id: string,
    key: TKey,
    value: ValueType<T[TType][TKey]>,
  ): Promise<void> {
    return this.storage.setField(type, id, key, value);
  }

  public async delete<TType extends StringKey<T>>(type: TType, id: string): Promise<void> {
    const accountKey = this.accountKeys[type];
    if (accountKey && this.loginTypes.includes(type)) {
      const original = await this.storage.get(type, id);
      if (!original) {
        throw new NotFoundHttpError();
      }
      const accountId = original[accountKey] as string;
      await this.checkAccount(type, accountId, false);
    }
    return this.storage.delete(type, id);
  }

  public async* entries<TType extends StringKey<T>>(type: TType): AsyncIterableIterator<TypeObject<T[TType]>> {
    for await (const entry of this.storage.entries(type)) {
      yield this.cleanOutput(entry);
    }
  }

  /**
   * Creates a timer that removes the account with the given ID if
   * it doesn't have a login method when the timer runs out.
   */
  protected createAccountTimeout(id: string): void {
    // eslint-disable-next-line ts/no-misused-promises
    const timer = setTimeout(async(): Promise<void> => {
      const account = await this.storage.get(ACCOUNT_TYPE, id);
      if (account && account[LOGIN_COUNT] === 0) {
        this.logger.debug(`Removing account with no login methods ${id}`);
        await this.storage.delete(ACCOUNT_TYPE, id);
      }
    }, this.expiration);
    timer.unref();
  }

  /**
   * Makes sure of the operation, adding or removing an object of the given type,
   * is allowed, based on the current amount of login methods on the given account.
   */
  protected async checkAccount(type: string, accountId: string, add: boolean): Promise<void> {
    const account = await this.storage.get(ACCOUNT_TYPE, accountId);
    if (!account) {
      throw new NotFoundHttpError();
    }

    if (this.loginTypes.includes(type)) {
      if (!add && account[LOGIN_COUNT] === 1) {
        this.logger.warn(`Trying to remove last login method from account ${accountId}`);
        throw new BadRequestHttpError('An account needs at least 1 login method.');
      }
      (account as TypeObject<typeof MINIMUM_ACCOUNT_DESCRIPTION>)[LOGIN_COUNT] += add ? 1 : -1;
      await this.storage.set(ACCOUNT_TYPE, account);
    } else if (account[LOGIN_COUNT] === 0) {
      this.logger.warn(`Trying to update account ${accountId} without login methods`);
      throw new BadRequestHttpError('An account needs at least 1 login method.');
    }
  }

  /**
   * Removes the field that keeps track of the login counts, to hide this from the output.
   */
  protected cleanOutput<TVal extends Record<string, unknown> | undefined>(this: void, value: TVal): TVal {
    if (value) {
      delete value[LOGIN_COUNT];
    }
    return value;
  }
}
