import type { Interaction } from '../../../../../src/identity/interaction/InteractionHandler';
import { PromptHandler } from '../../../../../src/identity/interaction/oidc/PromptHandler';
import type { InteractionRoute } from '../../../../../src/identity/interaction/routing/InteractionRoute';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';

describe('A PromptHandler', (): void => {
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
    await expect(handler.handle({} as any)).rejects.toThrow(BadRequestHttpError);
  });

  it('errors if the prompt is unsupported.', async(): Promise<void> => {
    oidcInteraction.prompt.name = 'unsupported';
    await expect(handler.handle({ oidcInteraction } as any)).rejects.toThrow(BadRequestHttpError);
  });

  it('returns a JSON body with the location and prompt.', async(): Promise<void> => {
    await expect(handler.handle({ oidcInteraction } as any)).resolves.toEqual(
      { json: { prompt: 'login', location: 'http://example.com/idp/login/' }},
    );
  });
});
