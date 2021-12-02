import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { CompletingInteractionHandler } from '../../../../src/identity/interaction/CompletingInteractionHandler';
import type {
  Interaction,
  InteractionHandlerInput,
} from '../../../../src/identity/interaction/InteractionHandler';
import type {
  InteractionCompleter,
  InteractionCompleterInput,
} from '../../../../src/identity/interaction/util/InteractionCompleter';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

const webId = 'http://alice.test.com/card#me';
class DummyCompletingInteractionHandler extends CompletingInteractionHandler {
  public constructor(interactionCompleter: InteractionCompleter) {
    super({}, interactionCompleter);
  }

  public async getCompletionParameters(input: Required<InteractionHandlerInput>): Promise<InteractionCompleterInput> {
    return { webId, oidcInteraction: input.oidcInteraction };
  }
}

describe('A CompletingInteractionHandler', (): void => {
  const oidcInteraction: Interaction = {} as any;
  const location = 'http://test.com/redirect';
  let operation: Operation;
  let interactionCompleter: jest.Mocked<InteractionCompleter>;
  let handler: DummyCompletingInteractionHandler;

  beforeEach(async(): Promise<void> => {
    const representation = new BasicRepresentation('', 'application/json');
    operation = {
      method: 'POST',
      body: representation,
    } as any;

    interactionCompleter = {
      handleSafe: jest.fn().mockResolvedValue(location),
    } as any;

    handler = new DummyCompletingInteractionHandler(interactionCompleter);
  });

  it('calls the parent JSON canHandle check.', async(): Promise<void> => {
    operation.body.metadata.contentType = 'application/x-www-form-urlencoded';
    await expect(handler.canHandle({ operation, oidcInteraction } as any)).rejects.toThrow(NotImplementedHttpError);
  });

  it('can handle GET requests without interaction.', async(): Promise<void> => {
    operation.method = 'GET';
    await expect(handler.canHandle({ operation } as any)).resolves.toBeUndefined();
  });

  it('errors if no OidcInteraction is defined on POST requests.', async(): Promise<void> => {
    const error = expect.objectContaining({
      statusCode: 400,
      message: 'This action can only be performed as part of an OIDC authentication flow.',
      errorCode: 'E0002',
    });
    await expect(handler.canHandle({ operation })).rejects.toThrow(error);

    await expect(handler.canHandle({ operation, oidcInteraction })).resolves.toBeUndefined();
  });

  it('throws a redirect error with the completer location.', async(): Promise<void> => {
    const error = expect.objectContaining({
      statusCode: 302,
      location,
    });
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(error);
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe).toHaveBeenLastCalledWith({ oidcInteraction, webId });
  });
});
