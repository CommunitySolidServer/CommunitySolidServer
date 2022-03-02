import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { InteractionHandler } from '../../../../src/identity/interaction/InteractionHandler';
import { SetupHttpHandler } from '../../../../src/init/setup/SetupHttpHandler';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { getBestPreference } from '../../../../src/storage/conversion/ConversionUtil';
import type { RepresentationConverterArgs,
  RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { APPLICATION_JSON, APPLICATION_X_WWW_FORM_URLENCODED } from '../../../../src/util/ContentTypes';
import { MethodNotAllowedHttpError } from '../../../../src/util/errors/MethodNotAllowedHttpError';
import { readableToString } from '../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';
import { CONTENT_TYPE } from '../../../../src/util/Vocabularies';

describe('A SetupHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  let operation: Operation;
  const storageKey = 'completed';
  let representation: Representation;
  let interactionHandler: jest.Mocked<InteractionHandler>;
  let templateEngine: jest.Mocked<TemplateEngine>;
  let converter: jest.Mocked<RepresentationConverter>;
  let storage: jest.Mocked<KeyValueStorage<string, any>>;
  let handler: SetupHttpHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://example.com/setup' },
      preferences: {},
      body: new BasicRepresentation(),
    };

    templateEngine = {
      render: jest.fn().mockReturnValue(Promise.resolve('<html>')),
    };

    converter = {
      handleSafe: jest.fn((input: RepresentationConverterArgs): Representation => {
        // Just find the best match;
        const type = getBestPreference(input.preferences.type!, { '*/*': 1 })!;
        const metadata = new RepresentationMetadata(input.representation.metadata, { [CONTENT_TYPE]: type.value });
        return new BasicRepresentation(input.representation.data, metadata);
      }),
    } as any;

    representation = new BasicRepresentation();
    interactionHandler = {
      handleSafe: jest.fn().mockResolvedValue(representation),
    } as any;

    storage = new Map<string, any>() as any;

    handler = new SetupHttpHandler({
      converter,
      storageKey,
      storage,
      handler: interactionHandler,
      templateEngine,
    });
  });

  it('only accepts GET and POST operations.', async(): Promise<void> => {
    operation = {
      method: 'DELETE',
      target: { path: 'http://example.com/setup' },
      preferences: {},
      body: new BasicRepresentation(),
    };
    await expect(handler.handle({ operation, request, response })).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('calls the template engine for GET requests.', async(): Promise<void> => {
    const result = await handler.handle({ operation, request, response });
    expect(result.data).toBeDefined();
    await expect(readableToString(result.data!)).resolves.toBe('<html>');
    expect(result.metadata?.contentType).toBe('text/html');

    // Setup is still enabled since this was a GET request
    expect(storage.get(storageKey)).toBeUndefined();
  });

  it('returns the handler result as 200 response.', async(): Promise<void> => {
    operation.method = 'POST';
    const result = await handler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(interactionHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(interactionHandler.handleSafe).toHaveBeenLastCalledWith({ operation });

    // Handler is now disabled due to successful POST
    expect(storage.get(storageKey)).toBe(true);
  });

  it('converts input bodies to JSON.', async(): Promise<void> => {
    operation.method = 'POST';
    operation.body.metadata.contentType = APPLICATION_X_WWW_FORM_URLENCODED;
    const result = await handler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(interactionHandler.handleSafe).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { body, ...partialOperation } = operation;
    expect(interactionHandler.handleSafe).toHaveBeenLastCalledWith(
      { operation: expect.objectContaining(partialOperation) },
    );
    expect(interactionHandler.handleSafe.mock.calls[0][0].operation.body.metadata.contentType).toBe(APPLICATION_JSON);

    // Handler is now disabled due to successful POST
    expect(storage.get(storageKey)).toBe(true);
  });
});
