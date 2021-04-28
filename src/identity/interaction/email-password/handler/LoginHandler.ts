import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
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
 * Handles the submission of the Login Form and logs
 * the user in.
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
    let prefilledEmail = '';
    try {
      const { email, password, remember } = await getFormDataRequestBody(input.request);

      // Qualify email
      assert(email && typeof email === 'string', 'Email required');
      prefilledEmail = email;

      // Qualify password
      assert(password && typeof password === 'string', 'Password required');

      // Qualify shouldRemember
      const shouldRemember = Boolean(remember);

      // Perform registration
      const webId = await this.accountStore.authenticate(email, password);

      // Complete the interaction interaction
      await this.interactionCompleter.handleSafe({ ...input, webId, shouldRemember });

      this.logger.debug(`Logging in user ${email}`);
    } catch (err: unknown) {
      throwIdpInteractionError(err, { email: prefilledEmail });
    }
  }
}
