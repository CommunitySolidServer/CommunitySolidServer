import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpRequest } from '../../../../server/HttpRequest';
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

// Results when parsing the input form data
type ParseResult = {
  email: string;
  password: string;
  webId: string;
  remember: boolean;
};

/**
 * Handles the submission of the registration form.
 * Creates the user and logs them in if successful.
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
    const { email, webId, password, remember } = await this.parseInput(input.request);
    try {
      // Check if WebId contains required triples and register new account if successful
      await this.ownershipValidator.handleSafe({ webId });
      await this.accountStore.create(email, webId, password);
      await this.interactionCompleter.handleSafe({
        ...input,
        webId,
        shouldRemember: Boolean(remember),
      });
      this.logger.debug(`Registering agent ${email} with WebId ${webId}`);
    } catch (err: unknown) {
      throwIdpInteractionError(err, { email, webId });
    }
  }

  /**
   * Parses and validates the input form data.
   * Will throw an {@link IdpInteractionError} in case something is wrong.
   * All relevant data that was correct up to that point will be prefilled.
   */
  private async parseInput(request: HttpRequest): Promise<ParseResult> {
    const prefilled: Record<string, string> = {};
    try {
      const { email, webId, password, confirmPassword, remember } = await getFormDataRequestBody(request);
      assert(typeof email === 'string' && email.length > 0, 'Email required');
      assert(emailRegex.test(email), 'Invalid email');
      prefilled.email = email;
      assert(typeof webId === 'string' && webId.length > 0, 'WebId required');
      prefilled.webId = webId;
      assertPassword(password, confirmPassword);
      return { email, password, webId, remember: Boolean(remember) };
    } catch (err: unknown) {
      throwIdpInteractionError(err, prefilled);
    }
  }
}
