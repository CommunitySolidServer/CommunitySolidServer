import { ExistingLoginHandler } from '../../../../src/identity/interaction/ExistingLoginHandler';
import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import type {
  InteractionCompleter,
} from '../../../../src/identity/interaction/util/InteractionCompleter';
import { FoundHttpError } from '../../../../src/util/errors/FoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { createPostJsonOperation } from './email-password/handler/Util';

describe('An ExistingLoginHandler', (): void => {
  const webId = 'http://test.com/id#me';
  let oidcInteraction: Interaction;
  let interactionCompleter: jest.Mocked<InteractionCompleter>;
  let handler: ExistingLoginHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = { session: { accountId: webId }} as any;

    interactionCompleter = {
      handleSafe: jest.fn().mockResolvedValue('http://test.com/redirect'),
    } as any;

    handler = new ExistingLoginHandler(interactionCompleter);
  });

  it('requires an oidcInteraction with a defined session.', async(): Promise<void> => {
    oidcInteraction.session = undefined;
    await expect(handler.handle({ operation: createPostJsonOperation({}), oidcInteraction }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the correct completion parameters.', async(): Promise<void> => {
    const operation = createPostJsonOperation({ remember: true });
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(FoundHttpError);
    expect(interactionCompleter.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionCompleter.handleSafe).toHaveBeenLastCalledWith({ oidcInteraction, webId, shouldRemember: true });
  });
});
