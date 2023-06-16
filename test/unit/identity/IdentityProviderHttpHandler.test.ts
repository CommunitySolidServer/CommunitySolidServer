import type { Operation } from '../../../src/http/Operation';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ProviderFactory } from '../../../src/identity/configuration/ProviderFactory';
import type { IdentityProviderHttpHandlerArgs } from '../../../src/identity/IdentityProviderHttpHandler';
import { IdentityProviderHttpHandler } from '../../../src/identity/IdentityProviderHttpHandler';
import type { Interaction, InteractionHandler } from '../../../src/identity/interaction/InteractionHandler';
import type { HttpRequest } from '../../../src/server/HttpRequest';
import type { HttpResponse } from '../../../src/server/HttpResponse';
import { getBestPreference } from '../../../src/storage/conversion/ConversionUtil';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../src/storage/conversion/RepresentationConverter';
import { APPLICATION_JSON, APPLICATION_X_WWW_FORM_URLENCODED } from '../../../src/util/ContentTypes';
import { CONTENT_TYPE } from '../../../src/util/Vocabularies';
import type Provider from '../../../templates/types/oidc-provider';

describe('An IdentityProviderHttpHandler', (): void => {
  const request: HttpRequest = {} as any;
  const response: HttpResponse = {} as any;
  const oidcInteraction: Interaction = {} as any;
  let operation: Operation;
  let representation: Representation;
  let providerFactory: jest.Mocked<ProviderFactory>;
  let converter: jest.Mocked<RepresentationConverter>;
  let provider: jest.Mocked<Provider>;
  let handler: jest.Mocked<InteractionHandler>;
  let idpHandler: IdentityProviderHttpHandler;

  beforeEach(async(): Promise<void> => {
    operation = {
      method: 'GET',
      target: { path: 'http://test.com/idp' },
      preferences: { type: { 'text/html': 1 }},
      body: new BasicRepresentation(),
    };

    provider = {
      interactionDetails: jest.fn().mockReturnValue(oidcInteraction),
    } as any;

    providerFactory = {
      getProvider: jest.fn().mockResolvedValue(provider),
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
    handler = {
      handleSafe: jest.fn().mockResolvedValue(representation),
    } as any;

    const args: IdentityProviderHttpHandlerArgs = {
      providerFactory,
      converter,
      handler,
    };
    idpHandler = new IdentityProviderHttpHandler(args);
  });

  it('returns the handler result as 200 response.', async(): Promise<void> => {
    const result = await idpHandler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ operation, oidcInteraction });
  });

  it('passes no interaction if the provider call failed.', async(): Promise<void> => {
    provider.interactionDetails.mockRejectedValueOnce(new Error('no interaction'));
    const result = await idpHandler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    expect(handler.handleSafe).toHaveBeenLastCalledWith({ operation });
  });

  it('converts input bodies to JSON.', async(): Promise<void> => {
    operation.body.metadata.contentType = APPLICATION_X_WWW_FORM_URLENCODED;
    const result = await idpHandler.handle({ operation, request, response });
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe(representation.data);
    expect(result.metadata).toBe(representation.metadata);
    expect(handler.handleSafe).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { body, ...partialOperation } = operation;
    expect(handler.handleSafe).toHaveBeenLastCalledWith(
      { operation: expect.objectContaining(partialOperation), oidcInteraction },
    );
    expect(handler.handleSafe.mock.calls[0][0].operation.body.metadata.contentType).toBe(APPLICATION_JSON);
  });
});
