import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { InteractionHttpHandlerInput } from '../../InteractionHttpHandler';
import { InteractionHttpHandler } from '../../InteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { InteractionCompleter } from '../../util/InteractionCompleter';
import type { OwnershipValidator } from '../../util/OwnershipValidator';
import { assertPassword, throwIdpInteractionError } from '../EmailPasswordUtil';
import type { AccountStore } from '../storage/AccountStore';

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/u;

interface RegistrationHandlerArgs {
  ownershipValidator: OwnershipValidator;
  accountStore: AccountStore;
  interactionCompleter: InteractionCompleter;
}

/**
 * Handles the submission of the registration form. Creates the
 * user and logs them in if successful.
 */
export class RegistrationHandler extends InteractionHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly ownershipValidator: OwnershipValidator;
  private readonly accountStore: AccountStore;
  private readonly interactionCompleter: InteractionCompleter;

  public constructor(args: RegistrationHandlerArgs) {
    super();
    this.ownershipValidator = args.ownershipValidator;
    this.accountStore = args.accountStore;
    this.interactionCompleter = args.interactionCompleter;
  }

  public async handle(input: InteractionHttpHandlerInput): Promise<void> {
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
      await this.ownershipValidator.handleSafe({ webId, interactionId: interactionDetails.uid });

      // Qualify password
      assertPassword(password, confirmPassword);

      // Qualify shouldRemember
      const shouldRemember = Boolean(remember);

      // Perform registration
      await this.accountStore.create(email, webId, password);

      // Complete the interaction interaction
      await this.interactionCompleter.handleSafe({
        ...input,
        webId,
        shouldRemember,
      });

      this.logger.debug(`Registering user ${email} with webId ${webId}`);
    } catch (err: unknown) {
      throwIdpInteractionError(err, { email: prefilledEmail, webId: prefilledWebId });
    }
  }
}
