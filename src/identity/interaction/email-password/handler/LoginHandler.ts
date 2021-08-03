import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpRequest } from '../../../../server/HttpRequest';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';
import { InteractionHandler } from './InteractionHandler';
import type { InteractionCompleteResult, InteractionHandlerInput } from './InteractionHandler';

/**
 * Handles the submission of the Login Form and logs the user in.
 */
export class LoginHandler extends InteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore) {
    super();
    this.accountStore = accountStore;
  }

  public async handle({ request }: InteractionHandlerInput): Promise<InteractionCompleteResult> {
    const { email, password, remember } = await this.parseInput(request);
    try {
      // Try to log in, will error if email/password combination is invalid
      const webId = await this.accountStore.authenticate(email, password);
      this.logger.debug(`Logging in user ${email}`);
      return {
        type: 'complete',
        details: { webId, shouldRemember: Boolean(remember) },
      };
    } catch (err: unknown) {
      throwIdpInteractionError(err, { email });
    }
  }

  /**
   * Parses and validates the input form data.
   * Will throw an {@link IdpInteractionError} in case something is wrong.
   * All relevant data that was correct up to that point will be prefilled.
   */
  private async parseInput(request: HttpRequest): Promise<{ email: string; password: string; remember: boolean }> {
    const prefilled: Record<string, string> = {};
    try {
      const { email, password, remember } = await getFormDataRequestBody(request);
      assert(typeof email === 'string' && email.length > 0, 'Email required');
      prefilled.email = email;
      assert(typeof password === 'string' && password.length > 0, 'Password required');
      return { email, password, remember: Boolean(remember) };
    } catch (err: unknown) {
      throwIdpInteractionError(err, prefilled);
    }
  }
}
