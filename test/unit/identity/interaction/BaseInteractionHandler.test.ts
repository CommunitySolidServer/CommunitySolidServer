import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { BaseInteractionHandler } from '../../../../src/identity/interaction/BaseInteractionHandler';
import type { InteractionHandlerInput } from '../../../../src/identity/interaction/InteractionHandler';
import { APPLICATION_JSON } from '../../../../src/util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { readJsonStream } from '../../../../src/util/StreamUtil';

class DummyBaseInteractionHandler extends BaseInteractionHandler {
  public constructor() {
    super({ view: 'view' });
  }

  public async handlePost(input: InteractionHandlerInput): Promise<Representation> {
    return new BasicRepresentation(JSON.stringify({ data: 'data' }), input.operation.target, APPLICATION_JSON);
  }
}

describe('A BaseInteractionHandler', (): void => {
  const handler = new DummyBaseInteractionHandler();

  it('can only handle GET and POST requests.', async(): Promise<void> => {
    const operation: Operation = {
      method: 'DELETE',
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
      preferences: {},
    };
    await expect(handler.canHandle({ operation })).rejects.toThrow(MethodNotAllowedHttpError);

    operation.method = 'GET';
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();

    operation.method = 'POST';
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
  });

  it('returns the view on GET requests.', async(): Promise<void> => {
    const operation: Operation = {
      method: 'GET',
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
      preferences: {},
    };
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ view: 'view' });
  });

  it('calls the handlePost function on POST requests.', async(): Promise<void> => {
    const operation: Operation = {
      method: 'POST',
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
      preferences: {},
    };
    const result = await handler.handle({ operation });
    await expect(readJsonStream(result.data)).resolves.toEqual({ data: 'data' });
  });

  it('rejects other methods.', async(): Promise<void> => {
    const operation: Operation = {
      method: 'DELETE',
      target: { path: 'http://example.com/foo' },
      body: new BasicRepresentation(),
      preferences: {},
    };
    await expect(handler.handle({ operation })).rejects.toThrow(MethodNotAllowedHttpError);
  });
});
