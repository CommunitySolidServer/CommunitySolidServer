import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdPInteractionHttpHandlerInput } from '../../IdPInteractionHttpHandler';
import { IdPInteractionHttpHandler } from '../../IdPInteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { IdpRenderHandler } from '../../util/IdpRenderHandler';
import type { OidcInteractionCompleter } from '../../util/OidcInteractionCompleter';
import type { WebIdOwnershipValidator } from '../../util/WebIdOwnershipValidator';
import type { EmailPasswordStorageAdapter } from '../storage/EmailPasswordStorageAdapter';

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/u;

interface EmailPasswordRegisterHandlerArgs {
  renderHandler: IdpRenderHandler;
  webIdOwnershipValidator: WebIdOwnershipValidator;
  emailPasswordStorageAdapter: EmailPasswordStorageAdapter;
  oidcInteractionCompleter: OidcInteractionCompleter;
}

export class EmailPasswordRegistrationHandler extends IdPInteractionHttpHandler {
  private readonly renderHandler: IdpRenderHandler;
  private readonly webIdOwnershipValidator: WebIdOwnershipValidator;
  private readonly emailPasswordStorageAdapter: EmailPasswordStorageAdapter;
  private readonly oidcInteractionCompleter: OidcInteractionCompleter;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordRegisterHandlerArgs) {
    super();
    this.renderHandler = args.renderHandler;
    this.webIdOwnershipValidator = args.webIdOwnershipValidator;
    this.emailPasswordStorageAdapter = args.emailPasswordStorageAdapter;
    this.oidcInteractionCompleter = args.oidcInteractionCompleter;
  }

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(
      input.request,
      input.response,
    );
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
      await this.webIdOwnershipValidator.assertWebIdOwnership(webId, interactionDetails.uid);

      // Qualify password
      assert(password && typeof password === 'string', 'Password required');
      assert(
        confirmPassword && typeof confirmPassword === 'string',
        'Confirm Password required',
      );
      assert(
        password === confirmPassword,
        'Password and confirm password do not match',
      );

      // Qualify shouldRemember
      const shouldRemember = Boolean(remember);

      // Perform registration
      await this.emailPasswordStorageAdapter.create(email, webId, password);

      // Complete the interaction interaction
      await this.oidcInteractionCompleter.handle({
        ...input,
        webId,
        shouldRemember,
      });
    } catch (err: unknown) {
      const errorMessage: string =
        err instanceof Error ? err.message : 'An unknown error occurred';
      await this.renderHandler.handle({
        response: input.response,
        props: {
          details: interactionDetails,
          errorMessage,
          prefilled: {
            email: prefilledEmail,
            webId: prefilledWebId,
          },
        },
      });
    }
  }
}
