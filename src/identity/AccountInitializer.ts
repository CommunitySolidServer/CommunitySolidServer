import { Initializer } from '../init/Initializer';
import { getLoggerFor } from '../logging/LogUtil';
import type { AccountStore } from './interaction/account/util/AccountStore';
import type { PasswordStore } from './interaction/password/util/PasswordStore';
import type { PodCreator } from './interaction/pod/util/PodCreator';

export interface AccountInitializerArgs {
  /**
   * Creates the accounts.
   */
  accountStore: AccountStore;
  /**
   * Adds the login methods.
   */
  passwordStore: PasswordStore;
  /**
   * Creates the pods.
   */
  podCreator: PodCreator;
  /**
   * Email address for the account login.
   */
  email: string;
  /**
   * Password for the account login.
   */
  password: string;
  /**
   * Name to use for the pod. If undefined the pod will be made in the root of the server.
   */
  name?: string;
}

/**
 * Initializes an account with email/password login and a pod with the provided name.
 */
export class AccountInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly passwordStore: PasswordStore;
  private readonly podCreator: PodCreator;
  private email: string | undefined;
  private password: string | undefined;
  private readonly name: string | undefined;

  public constructor(args: AccountInitializerArgs) {
    super();
    this.accountStore = args.accountStore;
    this.passwordStore = args.passwordStore;
    this.podCreator = args.podCreator;

    this.email = args.email;
    this.password = args.password;
    this.name = args.name;
  }

  public async handle(): Promise<void> {
    this.logger.info(`Creating account for ${this.email}`);
    const accountId = await this.accountStore.create();
    const id = await this.passwordStore.create(this.email!, accountId, this.password!);
    await this.passwordStore.confirmVerification(id);
    this.logger.info(`Creating pod ${this.name ? `with name ${this.name}` : 'at the root'}`);
    await this.podCreator.handleSafe({ accountId, name: this.name });

    // Not really necessary but don't want to keep passwords in memory if not required
    delete this.email;
    delete this.password;
  }
}
