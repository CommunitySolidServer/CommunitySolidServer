import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpRequest } from '../../../../server/HttpRequest';
import type { InteractionHttpHandlerInput } from '../../InteractionHttpHandler';
import { InteractionHttpHandler } from '../../InteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { InteractionCompleter } from '../../util/InteractionCompleter';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';

export interface LoginHandlerArgs {
  accountStore: AccountStore;
  interactionCompleter: InteractionCompleter;
}

/**
 * Handles the submission of the Login Form and logs the user in.
 */
export class LoginHandler extends InteractionHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly interactionCompleter: InteractionCompleter;

  public constructor(args: LoginHandlerArgs) {
    super();
    this.accountStore = args.accountStore;
    this.interactionCompleter = args.interactionCompleter;
  }

  public async handle(input: InteractionHttpHandlerInput): Promise<void> {
    const { email, password, remember } = await this.parseInput(input.request);
    try {
      // Try to log in, will error if email/password combination is invalid
      const webId = await this.accountStore.authenticate(email, password);
      await this.interactionCompleter.handleSafe({ ...input, webId, shouldRemember: Boolean(remember) });
      this.logger.debug(`Logging in user ${email}`);
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
