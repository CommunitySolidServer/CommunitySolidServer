import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import {
  InteractionHandler,
} from '../../../../src/identity/interaction/InteractionHandler';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

class SimpleInteractionHandler extends InteractionHandler {
  public async handle(): Promise<Representation> {
    return new BasicRepresentation();
  }
}

describe('An InteractionHandler', (): void => {
  const handler = new SimpleInteractionHandler();

  it('only supports JSON data or empty bodies.', async(): Promise<void> => {
    let representation = new BasicRepresentation('{}', 'application/json');
    await expect(handler.canHandle({ operation: { body: representation }} as any)).resolves.toBeUndefined();

    representation = new BasicRepresentation('', 'application/x-www-form-urlencoded');
    await expect(handler.canHandle({ operation: { body: representation }} as any))
      .rejects.toThrow(NotImplementedHttpError);

    representation = new BasicRepresentation();
    await expect(handler.canHandle({ operation: { body: representation }} as any)).resolves.toBeUndefined();
  });
});
