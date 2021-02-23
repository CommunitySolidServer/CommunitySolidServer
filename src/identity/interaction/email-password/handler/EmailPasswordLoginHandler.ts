import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdpInteractionHttpHandlerInput } from '../../IdpInteractionHttpHandler';
import { IdpInteractionHttpHandler } from '../../IdpInteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import type { IdpRenderHandler } from '../../util/IdpRenderHandler';
import type { OidcInteractionCompleter } from '../../util/OidcInteractionCompleter';
import type { EmailPasswordStore } from '../storage/EmailPasswordStore';

export interface EmailPasswordLoginHandlerArgs {
  emailPasswordStorageAdapter: EmailPasswordStore;
  oidcInteractionCompleter: OidcInteractionCompleter;
  renderHandler: IdpRenderHandler;
}

/**
 * Handles the submission of the Login Form and logs
 * the user in.
 */
export class EmailPasswordLoginHandler extends IdpInteractionHttpHandler {
  private readonly emailPasswordStorageAdapter: EmailPasswordStore;
  private readonly oidcInteractionCompleter: OidcInteractionCompleter;
  private readonly renderHandler: IdpRenderHandler;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordLoginHandlerArgs) {
    super();
    this.emailPasswordStorageAdapter = args.emailPasswordStorageAdapter;
    this.oidcInteractionCompleter = args.oidcInteractionCompleter;
    this.renderHandler = args.renderHandler;
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(
      input.request,
      input.response,
    );
    let prefilledEmail = '';
    try {
      const { email, password, remember } = await getFormDataRequestBody(
        input.request,
      );

      // Qualify email
      assert(email && typeof email === 'string', 'Email required');
      prefilledEmail = email;

      // Qualify password
      assert(password && typeof password === 'string', 'Password required');

      // Qualify shouldRemember
      const shouldRemember = Boolean(remember);

      // Perform registration
      const webId = await this.emailPasswordStorageAdapter.authenticate(
        email,
        password,
      );

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
          },
        },
      });
    }
  }
}
