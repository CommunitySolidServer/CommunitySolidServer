import assert from 'assert';
import type { IdpInteractionHttpHandlerInput } from '../../IdpInteractionHttpHandler';
import { IdpInteractionHttpHandler } from '../../IdpInteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { OidcInteractionCompleter } from '../../util/OidcInteractionCompleter';
import type { WebIdOwnershipValidator } from '../../util/WebIdOwnershipValidator';
import { assertPassword, throwIdpInteractionError } from '../EmailPasswordUtil';
import type { EmailPasswordStore } from '../storage/EmailPasswordStore';

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/u;

interface EmailPasswordRegisterHandlerArgs {
  webIdOwnershipValidator: WebIdOwnershipValidator;
  emailPasswordStorageAdapter: EmailPasswordStore;
  oidcInteractionCompleter: OidcInteractionCompleter;
}

/**
 * Handles the submission of the registration form. Creates the
 * user and logs them in if successful.
 */
export class EmailPasswordRegistrationHandler extends IdpInteractionHttpHandler {
  private readonly webIdOwnershipValidator: WebIdOwnershipValidator;
  private readonly emailPasswordStorageAdapter: EmailPasswordStore;
  private readonly oidcInteractionCompleter: OidcInteractionCompleter;

  public constructor(args: EmailPasswordRegisterHandlerArgs) {
    super();
    this.webIdOwnershipValidator = args.webIdOwnershipValidator;
    this.emailPasswordStorageAdapter = args.emailPasswordStorageAdapter;
    this.oidcInteractionCompleter = args.oidcInteractionCompleter;
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    let prefilledEmail = '';
    let prefilledWebId = '';
    try {
      const {
        email,
        webId,
        password,
        confirmPassword,
        remember,
      } = await getFormDataRequestBody(input.request);

      // Qualify email
      assert(email && typeof email === 'string', 'Email required');
      assert(emailRegex.test(email), 'Invalid email');
      prefilledEmail = email;

      // Qualify WebId
      assert(webId && typeof webId === 'string', 'WebId required');
      prefilledWebId = webId;
      await this.webIdOwnershipValidator.handleSafe({ webId, interactionId: interactionDetails.uid });

      // Qualify password
      assertPassword(password, confirmPassword);

      // Qualify shouldRemember
      const shouldRemember = Boolean(remember);

      // Perform registration
      await this.emailPasswordStorageAdapter.create(email, webId, password);

      // Complete the interaction interaction
      await this.oidcInteractionCompleter.handleSafe({
        ...input,
        webId,
        shouldRemember,
      });
    } catch (err: unknown) {
      throwIdpInteractionError(err, { email: prefilledEmail, webId: prefilledWebId });
    }
  }
}
