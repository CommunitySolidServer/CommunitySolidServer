import type {
  InteractionResponseResult,
} from '../../../../../../src/identity/interaction/email-password/handler/InteractionHandler';
import {
  InteractionHandler,
} from '../../../../../../src/identity/interaction/email-password/handler/InteractionHandler';
import { BasicRepresentation } from '../../../../../../src/ldp/representation/BasicRepresentation';
import { NotImplementedHttpError } from '../../../../../../src/util/errors/NotImplementedHttpError';

class SimpleInteractionHandler extends InteractionHandler {
  public async handle(): Promise<InteractionResponseResult> {
    return { type: 'response' };
  }
}

describe('An InteractionHandler', (): void => {
  const handler = new SimpleInteractionHandler();

  it('only supports JSON data.', async(): Promise<void> => {
    let representation = new BasicRepresentation('{}', 'application/json');
    await expect(handler.canHandle({ operation: { body: representation }} as any)).resolves.toBeUndefined();

    representation = new BasicRepresentation('', 'application/x-www-form-urlencoded');
    await expect(handler.canHandle({ operation: { body: representation }} as any))
      .rejects.toThrow(NotImplementedHttpError);

    await expect(handler.canHandle({ operation: {}} as any)).rejects.toThrow(NotImplementedHttpError);
  });
});
