import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type {
  JsonInteractionHandler,
  JsonInteractionHandlerInput,
} from '../../../../src/identity/interaction/JsonInteractionHandler';
import type { JsonView } from '../../../../src/identity/interaction/JsonView';
import { ViewInteractionHandler } from '../../../../src/identity/interaction/ViewInteractionHandler';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';

describe('A BaseInteractionHandler', (): void => {
  let input: JsonInteractionHandlerInput;
  let source: jest.Mocked<JsonInteractionHandler & JsonView>;
  let handler: ViewInteractionHandler;

  beforeEach(async(): Promise<void> => {
    input = {
      method: 'GET',
      target: { path: 'target' },
      json: { input: 'data' },
      metadata: new RepresentationMetadata(),
    };

    source = {
      getView: jest.fn().mockResolvedValue('view'),
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('response'),
      handleSafe: jest.fn(),
    };

    handler = new ViewInteractionHandler(source);
  });

  it('can only handle GET and POST requests.', async(): Promise<void> => {
    input.method = 'DELETE';

    await expect(handler.canHandle(input)).rejects.toThrow(MethodNotAllowedHttpError);

    input.method = 'GET';
    await expect(handler.canHandle(input)).resolves.toBeUndefined();

    input.method = 'POST';
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
  });

  it('returns the view on GET requests.', async(): Promise<void> => {
    input.method = 'GET';
    await expect(handler.handle(input)).resolves.toBe('view');
    expect(source.getView).toHaveBeenCalledTimes(1);
    expect(source.getView).toHaveBeenLastCalledWith(input);
  });

  it('calls the handlePost function on POST requests.', async(): Promise<void> => {
    input.method = 'POST';
    await expect(handler.handle(input)).resolves.toBe('response');
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith(input);
  });
});
