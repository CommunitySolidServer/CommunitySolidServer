import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdPInteractionHttpHandlerInput } from '../../IdPInteractionHttpHandler';
import { IdPInteractionHttpHandler } from '../../IdPInteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/getFormDataRequestBody';
import type { IdpRenderHandler } from '../../util/IdpRenderHandler';
import type { OidcInteractionCompleter } from '../../util/OidcInteractionCompleter';
import type { EmailPasswordStorageAdapter } from '../storage/EmailPasswordStorageAdapter';

export interface EmailPasswordLoginHandlerArgs {
  emailPasswordStorageAdapter: EmailPasswordStorageAdapter;
  oidcInteractionCompleter: OidcInteractionCompleter;
  renderHandler: IdpRenderHandler;
}

export class EmailPasswordLoginHandler extends IdPInteractionHttpHandler {
  private readonly emailPasswordStorageAdapter: EmailPasswordStorageAdapter;
  private readonly oidcInteractionCompleter: OidcInteractionCompleter;
  private readonly renderHandler: IdpRenderHandler;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordLoginHandlerArgs) {
    super();
    this.emailPasswordStorageAdapter = args.emailPasswordStorageAdapter;
    this.oidcInteractionCompleter = args.oidcInteractionCompleter;
    this.renderHandler = args.renderHandler;
  }

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    let prefilledEmail = '';
    try {
      const { email, password, remember } = await getFormDataRequestBody(input.request);

      // Qualify email
      assert(typeof email === 'string', 'Email required');
      prefilledEmail = email;

      // Qualify password
      assert(typeof password === 'string', 'Password required');

      // Qualify shouldRemember
      const shouldRemember = Boolean(remember);

      // Perform registration
      const webId = await this.emailPasswordStorageAdapter.authenticate(email, password);

      // Complete the interaction interaction
      await this.oidcInteractionCompleter.handle({ ...input, webId, shouldRemember });
    } catch (err: unknown) {
      const errorMessage: string = err instanceof Error ? err.message : 'An unknown error occurred';
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
