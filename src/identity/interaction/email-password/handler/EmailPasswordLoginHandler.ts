import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdpInteractionHttpHandlerInput } from '../../IdpInteractionHttpHandler';
import { IdpInteractionHttpHandler } from '../../IdpInteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { OidcInteractionCompleter } from '../../util/OidcInteractionCompleter';
import { throwIdpInteractionError } from '../EmailPasswordUtil';
import type { EmailPasswordStore } from '../storage/EmailPasswordStore';

export interface EmailPasswordLoginHandlerArgs {
  emailPasswordStorageAdapter: EmailPasswordStore;
  oidcInteractionCompleter: OidcInteractionCompleter;
}

/**
 * Handles the submission of the Login Form and logs
 * the user in.
 */
export class EmailPasswordLoginHandler extends IdpInteractionHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly emailPasswordStorageAdapter: EmailPasswordStore;
  private readonly oidcInteractionCompleter: OidcInteractionCompleter;

  public constructor(args: EmailPasswordLoginHandlerArgs) {
    super();
    this.emailPasswordStorageAdapter = args.emailPasswordStorageAdapter;
    this.oidcInteractionCompleter = args.oidcInteractionCompleter;
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
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
      const webId = await this.emailPasswordStorageAdapter.authenticate(email, password);

      // Complete the interaction interaction
      await this.oidcInteractionCompleter.handleSafe({ ...input, webId, shouldRemember });

      this.logger.debug(`Logging in user ${email}`);
    } catch (err: unknown) {
      throwIdpInteractionError(err, { email: prefilledEmail });
    }
  }
}
