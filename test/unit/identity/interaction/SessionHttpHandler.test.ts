import type { InteractionHandlerInput, Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import { SessionHttpHandler } from '../../../../src/identity/interaction/SessionHttpHandler';
import type {
  InteractionCompleter,
  InteractionCompleterInput,
} from '../../../../src/identity/interaction/util/InteractionCompleter';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { createPostJsonOperation } from './email-password/handler/Util';

class PublicSessionHttpHandler extends SessionHttpHandler {
  public constructor(interactionCompleter: InteractionCompleter) {
    super(interactionCompleter);
  }

  public async getCompletionParameters(input: Required<InteractionHandlerInput>): Promise<InteractionCompleterInput> {
    return super.getCompletionParameters(input);
  }
}

describe('A SessionHttpHandler', (): void => {
  const webId = 'http://test.com/id#me';
  let oidcInteraction: Interaction;
  let interactionCompleter: jest.Mocked<InteractionCompleter>;
  let handler: PublicSessionHttpHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = { session: { accountId: webId }} as any;

    interactionCompleter = {
      handleSafe: jest.fn().mockResolvedValue('http://test.com/redirect'),
    } as any;

    handler = new PublicSessionHttpHandler(interactionCompleter);
  });

  it('requires an oidcInteraction with a defined session.', async(): Promise<void> => {
    oidcInteraction.session = undefined;
    await expect(handler.getCompletionParameters({ operation: {} as any, oidcInteraction }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the correct completion parameters.', async(): Promise<void> => {
    const operation = createPostJsonOperation({ remember: true });
    await expect(handler.getCompletionParameters({ operation, oidcInteraction }))
      .resolves.toEqual({ oidcInteraction, webId, shouldRemember: true });
  });
});
