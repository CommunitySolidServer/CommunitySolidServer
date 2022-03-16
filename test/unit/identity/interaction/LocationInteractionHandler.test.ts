import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type {
  JsonInteractionHandler,
  JsonInteractionHandlerInput,
} from '../../../../src/identity/interaction/JsonInteractionHandler';
import { LocationInteractionHandler } from '../../../../src/identity/interaction/LocationInteractionHandler';
import { FoundHttpError } from '../../../../src/util/errors/FoundHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';

describe('A LocationInteractionHandler', (): void => {
  const representation = new BasicRepresentation();
  const input: JsonInteractionHandlerInput = {
    target: { path: 'http://example.com/target' },
    method: 'GET',
    json: { input: 'data' },
    metadata: new RepresentationMetadata(),
  };
  let source: jest.Mocked<JsonInteractionHandler>;
  let handler: LocationInteractionHandler;

  beforeEach(async(): Promise<void> => {
    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(representation),
    } as any;

    handler = new LocationInteractionHandler(source);
  });

  it('calls the source canHandle function.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenCalledTimes(1);
    expect(source.canHandle).toHaveBeenLastCalledWith(input);

    source.canHandle.mockRejectedValueOnce(new Error('bad input'));
    await expect(handler.canHandle(input)).rejects.toThrow('bad input');
  });

  it('returns the source output.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe(representation);
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
  });

  it('returns a location object in case of redirect errors.', async(): Promise<void> => {
    const location = 'http://example.com/foo';
    source.handle.mockRejectedValueOnce(new FoundHttpError(location));

    const response = await handler.handle(input);
    expect(response.metadata?.identifier.value).toEqual(input.target.path);
    expect(response.json).toEqual({ location });
  });

  it('rethrows non-redirect errors.', async(): Promise<void> => {
    source.handle.mockRejectedValueOnce(new NotFoundHttpError());

    await expect(handler.handle(input)).rejects.toThrow(NotFoundHttpError);
  });
});
