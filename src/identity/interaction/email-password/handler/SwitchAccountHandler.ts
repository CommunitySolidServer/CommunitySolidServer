import assert from 'assert';
import type { Operation } from '../../../../http/Operation';
import { BasicRepresentation } from '../../../../http/representation/BasicRepresentation';
import type { Representation } from '../../../../http/representation/Representation';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { APPLICATION_JSON } from '../../../../util/ContentTypes';
import { BadRequestHttpError } from '../../../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../../../util/errors/FoundHttpError';
import { readJsonStream } from '../../../../util/StreamUtil';
import { BaseInteractionHandler } from '../../BaseInteractionHandler';
import type { InteractionHandlerInput } from '../../InteractionHandler';
import type { LoginHandler } from './LoginHandler';

type SwitchAccountInput = {
  continueWithCurrentLogin: true;
} | {
  continueWithCurrentLogin: false;
  email: string;
  password: string;
  remember: boolean;
};

/**
 * Handles the submission of the Switch Account Form.
 * Will throw a RedirectHttpError on success.
 */
export class SwitchAccountHandler extends BaseInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly loginHandler: LoginHandler;

  public constructor(loginHandler: LoginHandler) {
    super({});
    this.loginHandler = loginHandler;
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

  protected async handleGet(input: Required<InteractionHandlerInput>): Promise<Representation> {
    const { operation, oidcInteraction } = input;

    const json = { webId: oidcInteraction.session?.accountId };

    return new BasicRepresentation(JSON.stringify(json), operation.target, APPLICATION_JSON);
  }

  public async handlePost({ operation, oidcInteraction }: InteractionHandlerInput): Promise<never> {
    const input = await this.parseInput(operation);

    if (input.continueWithCurrentLogin) {
      oidcInteraction!.result = {
        ...oidcInteraction!.lastSubmission,
        hasAskedToSwitchAccount: true,
      };
    } else {
      const webId = await this.loginHandler.emailLogin(input.email, input.password);
      oidcInteraction!.result = {
        login: {
          accountId: webId,
          remember: input.remember,
        },
        hasAskedToSwitchAccount: true,
      };
    }
    await oidcInteraction!.save(oidcInteraction!.exp - Math.floor(Date.now() / 1000));
    throw new FoundHttpError(oidcInteraction!.returnTo);
  }

  /**
   * Validates the input data. Also makes sure remember is a boolean.
   * Will throw an error in case something is wrong.
   */
  private async parseInput(operation: Operation): Promise<SwitchAccountInput> {
    const { email, password, remember, continueWithCurrentLogin } = await readJsonStream(operation.body.data);
    if (continueWithCurrentLogin === 'true') {
      return { continueWithCurrentLogin: true };
    }
    assert(typeof email === 'string' && email.length > 0, 'Email required');
    assert(typeof password === 'string' && password.length > 0, 'Password required');
    return { email, password, remember: Boolean(remember), continueWithCurrentLogin: false };
  }
}
