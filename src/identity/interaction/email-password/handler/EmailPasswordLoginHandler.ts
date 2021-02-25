import assert from 'assert';
import { HttpError } from '../../../../util/errors/HttpError';
import type { IdpInteractionHttpHandlerInput } from '../../IdpInteractionHttpHandler';
import { IdpInteractionHttpHandler } from '../../IdpInteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/FormDataUtil';
import { IdpInteractionError } from '../../util/IdpInteractionError';
import type { OidcInteractionCompleter } from '../../util/OidcInteractionCompleter';
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
      const { email, password, remember } = await getFormDataRequestBody(
        input.request,
      );

      // Qualify email
      assert(email && typeof email === 'string', 'EmailRequired');
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
      const prefilled = {
        email: prefilledEmail,
      };
      if (err instanceof HttpError) {
        throw new IdpInteractionError(err.statusCode, err.message, prefilled);
      } else if (err instanceof Error) {
        throw new IdpInteractionError(500, err.message, prefilled);
      } else {
        throw new IdpInteractionError(500, 'Unknown Error', prefilled);
      }
    }
  }
}
