import assert from 'assert';
import type { InteractionResults } from '../../../../../templates/types/oidc-provider';
import type { Operation } from '../../../../http/Operation';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../../../util/errors/FoundHttpError';
import { readJsonStream } from '../../../../util/StreamUtil';
import { BaseInteractionHandler } from '../../BaseInteractionHandler';
import type { InteractionHandlerInput } from '../../InteractionHandler';
import type { AccountStore } from '../storage/AccountStore';

const loginView = {
  required: {
    email: 'string',
    password: 'string',
    remember: 'boolean',
  },
} as const;

interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Handles the submission of the Login Form and logs the user in.
 * Will throw a RedirectHttpError on success.
 */
export class LoginHandler extends BaseInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore) {
    super(loginView);
    this.accountStore = accountStore;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await super.canHandle(input);
    if (input.operation.method === 'POST' && !input.oidcInteraction) {
      throw new BadRequestHttpError(
        'This action can only be performed as part of an OIDC authentication flow.',
        { errorCode: 'E0002' },
      );
    }
  }

  public async handlePost({ operation, oidcInteraction }: InteractionHandlerInput): Promise<never> {
    const { email, password, remember } = await this.parseInput(operation);
    // Try to log in, will error if email/password combination is invalid
    const webId = await this.accountStore.authenticate(email, password);
    const settings = await this.accountStore.getSettings(webId);
    if (!settings.useIdp) {
      // There is an account but is not used for identification with the IDP
      throw new BadRequestHttpError('This server is not an identity provider for this account.');
    }
    this.logger.debug(`Logging in user ${email}`);

    // Update the interaction to get the redirect URL
    const login: InteractionResults['login'] = {
      accountId: webId,
      remember,
    };
    oidcInteraction!.result = { login };
    await oidcInteraction!.save(oidcInteraction!.exp - Math.floor(Date.now() / 1000));

    throw new FoundHttpError(oidcInteraction!.returnTo);
  }

  /**
   * Validates the input data. Also makes sure remember is a boolean.
   * Will throw an error in case something is wrong.
   */
  private async parseInput(operation: Operation): Promise<LoginInput> {
    const { email, password, remember } = await readJsonStream(operation.body.data);
    assert(typeof email === 'string' && email.length > 0, 'Email required');
    assert(typeof password === 'string' && password.length > 0, 'Password required');
    return { email, password, remember: Boolean(remember) };
  }
}
