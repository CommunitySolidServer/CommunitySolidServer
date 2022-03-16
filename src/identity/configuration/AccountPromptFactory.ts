import { interactionPolicy } from 'oidc-provider';
import type { CookieStore } from '../interaction/account/util/CookieStore';
import { ACCOUNT_PROMPT } from '../interaction/InteractionUtil';
import type { PromptFactory } from './PromptFactory';
import Prompt = interactionPolicy.Prompt;
import Check = interactionPolicy.Check;

/**
 * Creates the prompt necessary to ensure a user is logged in with their account when doing an OIDC interaction.
 * This is done by checking the presence of the account-related cookie.
 */
export class AccountPromptFactory implements PromptFactory {
  private readonly cookieStore: CookieStore;
  private readonly cookieName: string;

  public constructor(cookieStore: CookieStore, cookieName: string) {
    this.cookieStore = cookieStore;
    this.cookieName = cookieName;
  }

  // TODO: should somehow use the { [ACCOUNT_PROMPT]: accountId } value in here?
  public getPrompt(): Prompt {
    const check = new Check('no_account', 'An account cookie is required.', async(ctx): Promise<boolean> => {
      const cookie = ctx.cookies.get(this.cookieName);
      let accountId: string | undefined;
      if (cookie) {
        accountId = await this.cookieStore.get(cookie);
      }
      console.log('PROMPT', cookie, accountId);
      // Check needs to return true if the prompt has to trigger
      return !accountId;
    });
    return new Prompt({ name: ACCOUNT_PROMPT, requestable: true }, check);
  }
}
