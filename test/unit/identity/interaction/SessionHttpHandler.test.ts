import type { Interaction } from '../../../../src/identity/interaction/email-password/handler/InteractionHandler';
import { SessionHttpHandler } from '../../../../src/identity/interaction/SessionHttpHandler';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { createPostJsonOperation } from './email-password/handler/Util';

describe('A SessionHttpHandler', (): void => {
  const webId = 'http://test.com/id#me';
  let oidcInteraction: Interaction;
  let handler: SessionHttpHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = { session: { accountId: webId }} as any;

    handler = new SessionHttpHandler();
  });

  it('requires a defined oidcInteraction with a session.', async(): Promise<void> => {
    oidcInteraction!.session = undefined;
    await expect(handler.handle({ operation: {} as any, oidcInteraction })).rejects.toThrow(NotImplementedHttpError);

    await expect(handler.handle({ operation: {} as any })).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns an InteractionCompleteResult when done.', async(): Promise<void> => {
    const operation = createPostJsonOperation({ remember: true });
    await expect(handler.handle({ operation, oidcInteraction })).resolves.toEqual({
      details: { webId, shouldRemember: true },
      type: 'complete',
    });
  });
});
