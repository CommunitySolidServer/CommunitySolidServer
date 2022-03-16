import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { AccountStore } from '../interaction/account/util/AccountStore';
import type { CookieStore } from '../interaction/account/util/CookieStore';
import { ACCOUNT_PROMPT } from '../interaction/InteractionUtil';
import { PromptFactory } from './PromptFactory';
import Prompt = interactionPolicy.Prompt;
import Check = interactionPolicy.Check;
import DefaultPolicy = interactionPolicy.DefaultPolicy;

type OIDCContext = NonNullable<KoaContextWithOIDC['oidc']['entities']['OIDCContext']>;
type ExtendedContext = OIDCContext & { internalAccountId?: string };

/**
 * Creates the prompt necessary to ensure a user is logged in with their account when doing an OIDC interaction.
 * This is done by checking the presence of the account-related cookie.
 *
 * Adds a Check to the login policy that verifies if the stored accountId, which corresponds to the chosen WebID,
 * belongs to the currently logged in account.
 */
export class AccountPromptFactory extends PromptFactory {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly cookieStore: CookieStore;
  private readonly cookieName: string;

  public constructor(accountStore: AccountStore, cookieStore: CookieStore, cookieName: string) {
    super();
    this.accountStore = accountStore;
    this.cookieStore = cookieStore;
    this.cookieName = cookieName;
  }

  public async handle(policy: DefaultPolicy): Promise<void> {
    this.addAccountPrompt(policy);
    this.addWebIdVerificationPrompt(policy);
  }

  private addAccountPrompt(policy: DefaultPolicy): void {
    const check = new Check('no_account', 'An account cookie is required.', async(ctx): Promise<boolean> => {
      const cookie = ctx.cookies.get(this.cookieName);
      let accountId: string | undefined;
      if (cookie) {
        accountId = await this.cookieStore.get(cookie);
        // This is an ugly way to pass a value to the other prompts/checks,
        // but the oidc-provider library does similar things internally.
        (ctx.oidc as ExtendedContext).internalAccountId = accountId;
      }
      this.logger.debug(`Found account cookie ${cookie} and accountID ${accountId}`);

      // Check needs to return true if the prompt has to trigger
      return !accountId;
    });
    const accountPrompt = new Prompt({ name: ACCOUNT_PROMPT, requestable: true }, check);
    policy.add(accountPrompt, 0);
  }

  private addWebIdVerificationPrompt(policy: DefaultPolicy): void {
    const check = new Check('no_webid_ownserhip',
      'The stored WebID does not belong to the account.',
      async(ctx): Promise<boolean> => {
        if (!ctx.oidc.session?.accountId) {
          return false;
        }

        const accountId = (ctx.oidc as ExtendedContext).internalAccountId;
        if (!accountId) {
          this.logger.error(`Missing 'internalAccountId' value in OIDC context`);
          return false;
        }

        const account = await this.accountStore.get(accountId);
        if (!account) {
          this.logger.error(`Invalid account ID ${accountId}`);
          return false;
        }

        const owner = account.webIds[ctx.oidc.session.accountId];
        this.logger.debug(`Session has WebID ${ctx.oidc.session.accountId
        }, which ${owner ? 'belongs' : 'does not belong'} to the authenticated account`);

        return !owner;
      });
    const loginPrompt = policy.get('login');
    if (!loginPrompt) {
      throw new InternalServerError('Missing default login policy');
    }
    loginPrompt.checks.add(check);
  }
}
