import { createResponse } from 'node-mocks-http';
import { AllowAcceptHeaderWriter } from '../../../../../src/http/output/metadata/AllowAcceptHeaderWriter';
import type { MetadataRecord } from '../../../../../src/http/representation/RepresentationMetadata';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { MethodNotAllowedHttpError } from '../../../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { LDP, PIM, RDF, SOLID_ERROR } from '../../../../../src/util/Vocabularies';

describe('An AllowAcceptHeaderWriter', (): void => {
  const document = new RepresentationMetadata({ path: 'http://example.com/foo/bar' },
    { [RDF.type]: LDP.terms.Resource });
  const emptyContainer = new RepresentationMetadata({ path: 'http://example.com/foo/' },
    { [RDF.type]: [ LDP.terms.Resource, LDP.terms.Container ]});
  const fullContainer = new RepresentationMetadata({ path: 'http://example.com/foo/' },
    {
      [RDF.type]: [ LDP.terms.Resource, LDP.terms.Container ],
      [LDP.contains]: [ document.identifier ],
      // Typescript doesn't find the correct constructor without the cast
    } as MetadataRecord);
  const storageContainer = new RepresentationMetadata({ path: 'http://example.com/foo/' },
    { [RDF.type]: [ LDP.terms.Resource, LDP.terms.Container, PIM.terms.Storage ]});
  const error404 = new RepresentationMetadata({ [SOLID_ERROR.errorResponse]: NotFoundHttpError.uri });
  const error405 = new RepresentationMetadata(
    { [SOLID_ERROR.errorResponse]: MethodNotAllowedHttpError.uri, [SOLID_ERROR.disallowedMethod]: 'PUT' },
  );
  const error415 = new RepresentationMetadata({ [SOLID_ERROR.errorResponse]: UnsupportedMediaTypeHttpError.uri });
  let response: HttpResponse;
  let writer: AllowAcceptHeaderWriter;

  beforeEach(async(): Promise<void> => {
    response = createResponse();

    writer = new AllowAcceptHeaderWriter(
      [ 'OPTIONS', 'GET', 'HEAD', 'PUT', 'POST', 'PATCH', 'DELETE' ],
      { patch: [ 'text/n3', 'application/sparql-update' ], post: [ '*/*' ], put: [ '*/*' ]},
    );
  });

  it('returns all methods except POST for a document.', async(): Promise<void> => {
    await expect(writer.handleSafe({ response, metadata: document })).resolves.toBeUndefined();
    const headers = response.getHeaders();
    expect(typeof headers.allow).toBe('string');
    expect(new Set((headers.allow as string).split(', ')))
      .toEqual(new Set([ 'OPTIONS', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE' ]));
    expect(headers['accept-patch']).toBe('text/n3, application/sparql-update');
    expect(headers['accept-put']).toBe('*/*');
    expect(headers['accept-post']).toBeUndefined();
  });

  it('returns all methods for an empty container.', async(): Promise<void> => {
    await expect(writer.handleSafe({ response, metadata: emptyContainer })).resolves.toBeUndefined();
    const headers = response.getHeaders();
    expect(typeof headers.allow).toBe('string');
    expect(new Set((headers.allow as string).split(', ')))
      .toEqual(new Set([ 'OPTIONS', 'GET', 'HEAD', 'PUT', 'POST', 'PATCH', 'DELETE' ]));
    expect(headers['accept-patch']).toBe('text/n3, application/sparql-update');
    expect(headers['accept-put']).toBe('*/*');
    expect(headers['accept-post']).toBe('*/*');
  });

  it('returns all methods except DELETE for a non-empty container.', async(): Promise<void> => {
    await expect(writer.handleSafe({ response, metadata: fullContainer })).resolves.toBeUndefined();
    const headers = response.getHeaders();
    expect(typeof headers.allow).toBe('string');
    expect(new Set((headers.allow as string).split(', ')))
      .toEqual(new Set([ 'OPTIONS', 'GET', 'HEAD', 'PUT', 'POST', 'PATCH' ]));
    expect(headers['accept-patch']).toBe('text/n3, application/sparql-update');
    expect(headers['accept-put']).toBe('*/*');
    expect(headers['accept-post']).toBe('*/*');
  });

  it('returns all methods except DELETE for a storage container.', async(): Promise<void> => {
    await expect(writer.handleSafe({ response, metadata: storageContainer })).resolves.toBeUndefined();
    const headers = response.getHeaders();
    expect(typeof headers.allow).toBe('string');
    expect(new Set((headers.allow as string).split(', ')))
      .toEqual(new Set([ 'OPTIONS', 'GET', 'HEAD', 'PUT', 'POST', 'PATCH' ]));
    expect(headers['accept-patch']).toBe('text/n3, application/sparql-update');
    expect(headers['accept-put']).toBe('*/*');
    expect(headers['accept-post']).toBe('*/*');
  });

  it('returns PATCH and PUT if the target does not exist.', async(): Promise<void> => {
    await expect(writer.handleSafe({ response, metadata: error404 })).resolves.toBeUndefined();
    const headers = response.getHeaders();
    expect(typeof headers.allow).toBe('string');
    expect(new Set((headers.allow as string).split(', ')))
      .toEqual(new Set([ 'PUT', 'PATCH' ]));
    expect(headers['accept-patch']).toBe('text/n3, application/sparql-update');
    expect(headers['accept-put']).toBe('*/*');
    expect(headers['accept-post']).toBeUndefined();
  });

  it('removes methods that are not allowed by a 405 error.', async(): Promise<void> => {
    await expect(writer.handleSafe({ response, metadata: error405 })).resolves.toBeUndefined();
    const headers = response.getHeaders();
    expect(typeof headers.allow).toBe('string');
    expect(new Set((headers.allow as string).split(', ')))
      .toEqual(new Set([ 'OPTIONS', 'GET', 'HEAD', 'POST', 'PATCH', 'DELETE' ]));
    expect(headers['accept-patch']).toBe('text/n3, application/sparql-update');
    expect(headers['accept-put']).toBeUndefined();
    expect(headers['accept-post']).toBe('*/*');
  });

  it('only returns Accept- headers in case of a 415.', async(): Promise<void> => {
    await expect(writer.handleSafe({ response, metadata: error415 })).resolves.toBeUndefined();
    const headers = response.getHeaders();
    expect(headers.allow).toBeUndefined();
    expect(headers['accept-patch']).toBe('text/n3, application/sparql-update');
    expect(headers['accept-put']).toBe('*/*');
    expect(headers['accept-post']).toBe('*/*');
  });
});
