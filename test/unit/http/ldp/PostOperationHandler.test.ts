import { PostOperationHandler } from '../../../../src/http/ldp/PostOperationHandler';
import type { Operation } from '../../../../src/http/Operation';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { Conditions } from '../../../../src/storage/conditions/Conditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { IdentifierMap } from '../../../../src/util/map/IdentifierMap';
import { AS, LDP, RDF, SOLID_AS, SOLID_HTTP } from '../../../../src/util/Vocabularies';

describe('A PostOperationHandler', (): void => {
  let operation: Operation;
  let body: Representation;
  const conditions: Conditions = { matchesMetadata: jest.fn() };
  let store: jest.Mocked<ResourceStore>;
  let handler: PostOperationHandler;

  beforeEach(async(): Promise<void> => {
    body = new BasicRepresentation('', 'text/turtle');
    operation = { method: 'POST', target: { path: 'http://test.com/foo' }, body, conditions, preferences: {}};
    store = {
      addResource: jest.fn().mockResolvedValue(new IdentifierMap([
        [{ path: 'https://example.com/parent/newPath' }, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Create }) ],
        [{ path: 'https://example.com/parent/' }, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Update }) ],
      ])),
    } as any;
    handler = new PostOperationHandler(store);
  });

  it('only supports POST operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation })).resolves.toBeUndefined();
    operation.method = 'GET';
    await expect(handler.canHandle({ operation })).rejects.toThrow(NotImplementedHttpError);
  });

  it('errors if there is no content-type.', async(): Promise<void> => {
    operation.body.metadata.contentType = undefined;
    await expect(handler.handle({ operation })).rejects.toThrow(BadRequestHttpError);
  });

  it('creates a new container when there is no content-type.', async(): Promise<void> => {
    operation.body.metadata.contentType = undefined;
    operation.body.metadata.add(RDF.terms.type, LDP.terms.BasicContainer);
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(201);
    expect(result.metadata).toBeInstanceOf(RepresentationMetadata);
    expect(result.data).toBeUndefined();
    expect(store.addResource).toHaveBeenCalledTimes(1);
    expect(store.addResource).toHaveBeenLastCalledWith(operation.target, body, conditions);
  });

  it('adds the given representation to the store and returns the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ operation });
    expect(result.statusCode).toBe(201);
    expect(result.metadata).toBeInstanceOf(RepresentationMetadata);
    expect(result.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe('https://example.com/parent/newPath');
    expect(result.data).toBeUndefined();
    expect(store.addResource).toHaveBeenCalledTimes(1);
    expect(store.addResource).toHaveBeenLastCalledWith(operation.target, body, conditions);
  });

  it('errors if the store returns no created identifier.', async(): Promise<void> => {
    store.addResource.mockResolvedValueOnce(new IdentifierMap([
      [{ path: 'https://example.com/parent/' }, new RepresentationMetadata({ [SOLID_AS.activity]: AS.terms.Update }) ],
    ]));
    await expect(handler.handle({ operation })).rejects.toThrow(InternalServerError);
  });
});
