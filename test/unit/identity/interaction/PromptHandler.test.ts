import type { Operation } from '../../../../src/http/Operation';
import type { Interaction } from '../../../../src/identity/interaction/InteractionHandler';
import { PromptHandler } from '../../../../src/identity/interaction/PromptHandler';
import type { InteractionRoute } from '../../../../src/identity/interaction/routing/InteractionRoute';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('A PromptHandler', (): void => {
  const operation: Operation = { target: { path: 'http://example.com/test/' }} as any;
  let oidcInteraction: Interaction;
  let promptRoutes: Record<string, jest.Mocked<InteractionRoute>>;
  let handler: PromptHandler;

  beforeEach(async(): Promise<void> => {
    oidcInteraction = { prompt: { name: 'login' }} as any;
    promptRoutes = {
      login: { getPath: jest.fn().mockReturnValue('http://example.com/idp/login/') } as any,
    };
    handler = new PromptHandler(promptRoutes);
  });

  it('errors if there is no interaction.', async(): Promise<void> => {
    await expect(handler.handle({ operation })).rejects.toThrow(BadRequestHttpError);
  });

  it('errors if the prompt is unsupported.', async(): Promise<void> => {
    oidcInteraction.prompt.name = 'unsupported';
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(BadRequestHttpError);
  });

  it('throws a redirect error with the correct location.', async(): Promise<void> => {
    const error = expect.objectContaining({
      statusCode: 302,
      location: 'http://example.com/idp/login/',
    });
    await expect(handler.handle({ operation, oidcInteraction })).rejects.toThrow(error);
  });
});
