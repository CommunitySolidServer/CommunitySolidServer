import assert from 'assert';
import type { Operation } from '../../../../http/Operation';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { readJsonStream } from '../../../../util/StreamUtil';
import { CompletingInteractionHandler } from '../../CompletingInteractionHandler';
import type { InteractionHandlerInput } from '../../InteractionHandler';
import type { InteractionCompleterInput, InteractionCompleter } from '../../util/InteractionCompleter';

import type { AccountStore } from '../storage/AccountStore';

/**
 * Handles the submission of the Login Form and logs the user in.
 * Will throw a RedirectHttpError on success.
 */
export class LoginHandler extends CompletingInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore, interactionCompleter: InteractionCompleter) {
    super(interactionCompleter);
    this.accountStore = accountStore;
  }

  protected async getCompletionParameters({ operation, oidcInteraction }: Required<InteractionHandlerInput>):
  Promise<InteractionCompleterInput> {
    const { email, password, remember } = await this.parseInput(operation);
    // Try to log in, will error if email/password combination is invalid
    const webId = await this.accountStore.authenticate(email, password);
    const settings = await this.accountStore.getSettings(webId);
    if (!settings.useIdp) {
      // There is an account but is not used for identification with the IDP
      throw new BadRequestHttpError('This server is not an identity provider for this account.');
    }
    this.logger.debug(`Logging in user ${email}`);

    return { oidcInteraction, webId, shouldRemember: remember };
  }

  /**
   * Parses and validates the input form data.
   * Will throw an error in case something is wrong.
   * All relevant data that was correct up to that point will be prefilled.
   */
  private async parseInput(operation: Operation): Promise<{ email: string; password: string; remember: boolean }> {
    const prefilled: Record<string, string> = {};
    const { email, password, remember } = await readJsonStream(operation.body.data);
    assert(typeof email === 'string' && email.length > 0, 'Email required');
    prefilled.email = email;
    assert(typeof password === 'string' && password.length > 0, 'Password required');
    return { email, password, remember: Boolean(remember) };
  }
}
