import { readJsonStream, SwitchAccountHandler } from '../../../../../../src';
import type { LoginHandler } from '../../../../../../src/identity/interaction/email-password/handler/LoginHandler';
import type {
  Interaction,
  InteractionHandlerInput,
} from '../../../../../../src/identity/interaction/InteractionHandler';
import { FoundHttpError } from '../../../../../../src/util/errors/FoundHttpError';
import { createPostJsonOperation } from './Util';

describe('A SwitchAccountHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  let oidcInteraction: jest.Mocked<Interaction>;
  let input: Required<InteractionHandlerInput>;
  let loginHandler: jest.Mocked<LoginHandler>;
  let handler: SwitchAccountHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = {
      exp: 123456,
      save: jest.fn(),
      session: {
        accountId: webId,
      },
    } as any;

    input = { oidcInteraction } as any;

    loginHandler = {
      emailLogin: jest.fn().mockResolvedValue(webId),
    } as any;

    handler = new SwitchAccountHandler(loginHandler);
  });
  it('errors if no oidcInteraction is defined on POST requests.', async(): Promise<void> => {
    const error = expect.objectContaining({
      statusCode: 400,
      message: 'This action can only be performed as part of an OIDC authentication flow.',
      errorCode: 'E0002',
    });
    await expect(handler.canHandle({ operation: createPostJsonOperation({}) })).rejects.toThrow(error);

    await expect(handler.canHandle({ operation: createPostJsonOperation({}), oidcInteraction }))
      .resolves.toBeUndefined();
  });

  it('errors on invalid emails when switching accounts.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ continueWithCurrentLogin: 'false' });
    await expect(handler.handle(input)).rejects.toThrow('Email required');
    input.operation = createPostJsonOperation({ continueWithCurrentLogin: 'false', email: [ 'a', 'b' ]});
    await expect(handler.handle(input)).rejects.toThrow('Email required');
  });

  it('errors on invalid passwords when switching accounts.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ continueWithCurrentLogin: 'false', email });
    await expect(handler.handle(input)).rejects.toThrow('Password required');
    input.operation = createPostJsonOperation({ continueWithCurrentLogin: 'false', email, password: [ 'a', 'b' ]});
    await expect(handler.handle(input)).rejects.toThrow('Password required');
  });

  it('returns the generated redirect URL when the account is switched.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ continueWithCurrentLogin: 'false', email, password: 'password!' });
    await expect(handler.handle(input)).rejects.toThrow(FoundHttpError);
    expect(oidcInteraction.save).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.result).toEqual({
      login: { accountId: webId, remember: false },
      hasAskedToSwitchAccount: true,
    });
  });

  it('returns the generated redirect URL when the account is not switched.', async(): Promise<void> => {
    input.operation = createPostJsonOperation({ continueWithCurrentLogin: 'true', email, password: 'password!' });
    await expect(handler.handle(input)).rejects.toThrow(FoundHttpError);
    expect(oidcInteraction.save).toHaveBeenCalledTimes(1);
    expect(oidcInteraction.result).toEqual({
      hasAskedToSwitchAccount: true,
    });
  });

  it('returns a user webId on a GET request.', async(): Promise<void> => {
    const operation = { method: 'GET', target: { path: 'http://example.com/foo' }} as any;
    const representation = await handler.handle({ operation, oidcInteraction });
    await expect(readJsonStream(representation.data)).resolves.toEqual({
      webId,
    });
  });

  it('does not return a webId if the user is not logged in.', async(): Promise<void> => {
    const operation = { method: 'GET', target: { path: 'http://example.com/foo' }} as any;
    delete oidcInteraction.session;
    const representation = await handler.handle({ operation, oidcInteraction });
    await expect(readJsonStream(representation.data)).resolves.toEqual({
      webId: undefined,
    });
  });
});
