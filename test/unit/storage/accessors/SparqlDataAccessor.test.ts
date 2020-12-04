import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { SparqlDataAccessor } from '../../../../src/storage/accessors/SparqlDataAccessor';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { CONTENT_TYPE, LDP, RDF } from '../../../../src/util/UriConstants';
import { toNamedNode } from '../../../../src/util/UriUtil';

const { literal, namedNode, quad } = DataFactory;

jest.mock('fetch-sparql-endpoint');

const simplifyQuery = (query: string | string[]): string => {
  if (Array.isArray(query)) {
    query = query.join(' ');
  }
  return query.replace(/\n/gu, ' ').trim();
};

describe('A SparqlDataAccessor', (): void => {
  const endpoint = 'http://test.com/sparql';
  const base = 'http://test.com/';
  let accessor: SparqlDataAccessor;
  let metadata: RepresentationMetadata;
  let data: Guarded<Readable>;
  let fetchTriples: jest.Mock<Promise<Readable>>;
  let fetchUpdate: jest.Mock<Promise<void>>;
  let triples: Quad[];
  let fetchError: any;
  let updateError: any;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata();
    data = guardedStreamFrom(
      [ quad(namedNode('http://name'), namedNode('http://pred'), literal('value')) ],
    );
    triples = [ quad(namedNode('this'), namedNode('a'), namedNode('triple')) ];

    // Makes it so the `SparqlEndpointFetcher` will always return the contents of the `triples` array
    fetchTriples = jest.fn(async(): Promise<Readable> => {
      if (fetchError) {
        throw fetchError;
      }
      return Readable.from(triples);
    });
    fetchUpdate = jest.fn(async(): Promise<void> => {
      if (updateError) {
        throw updateError;
      }
    });
    (SparqlEndpointFetcher as any).mockImplementation((): any => ({
      fetchTriples,
      fetchUpdate,
    }));

    // This needs to be last so the fetcher can be mocked first
    accessor = new SparqlDataAccessor(endpoint, base);
  });

  it('can only handle quad data.', async(): Promise<void> => {
    await expect(accessor.canHandle({ binary: true, data, metadata })).rejects.toThrow(UnsupportedMediaTypeHttpError);
    metadata.contentType = 'newInternalType';
    await expect(accessor.canHandle({ binary: false, data, metadata })).rejects.toThrow(UnsupportedMediaTypeHttpError);
    metadata.contentType = INTERNAL_QUADS;
    await expect(accessor.canHandle({ binary: false, data, metadata })).resolves.toBeUndefined();
  });

  it('returns the corresponding quads when data is requested.', async(): Promise<void> => {
    const result = await accessor.getData({ path: 'http://identifier' });
    await expect(arrayifyStream(result)).resolves.toBeRdfIsomorphic([
      quad(namedNode('this'), namedNode('a'), namedNode('triple')),
    ]);

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery(
      'CONSTRUCT { ?s ?p ?o. } WHERE { GRAPH <http://identifier> { ?s ?p ?o. } }',
    ));
  });

  it('returns the corresponding metadata when requested.', async(): Promise<void> => {
    metadata = await accessor.getMetadata({ path: 'http://identifier' });
    expect(metadata.quads()).toBeRdfIsomorphic([
      quad(namedNode('this'), namedNode('a'), namedNode('triple')),
      quad(namedNode('http://identifier'), toNamedNode(CONTENT_TYPE), literal(INTERNAL_QUADS)),
    ]);

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery(
      'CONSTRUCT { ?s ?p ?o. } WHERE { GRAPH <meta:http://identifier> { ?s ?p ?o. } }',
    ));
  });

  it('requests container data for generating its metadata.', async(): Promise<void> => {
    metadata = await accessor.getMetadata({ path: 'http://container/' });
    expect(metadata.quads()).toBeRdfIsomorphic([
      quad(namedNode('this'), namedNode('a'), namedNode('triple')),
    ]);

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery([
      'CONSTRUCT { ?s ?p ?o. } WHERE {',
      '  { GRAPH <http://container/> { ?s ?p ?o. } }',
      '  UNION',
      '  { GRAPH <meta:http://container/> { ?s ?p ?o. } }',
      '}',
    ]));
  });

  it('generates resource metadata for the root container.', async(): Promise<void> => {
    metadata = await accessor.getMetadata({ path: base });
    expect(metadata.quads()).toBeRdfIsomorphic([
      quad(namedNode('this'), namedNode('a'), namedNode('triple')),
      quad(namedNode(base), toNamedNode(RDF.type), toNamedNode(LDP.Container)),
      quad(namedNode(base), toNamedNode(RDF.type), toNamedNode(LDP.BasicContainer)),
      quad(namedNode(base), toNamedNode(RDF.type), toNamedNode(LDP.Resource)),
    ]);

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery([
      'CONSTRUCT { ?s ?p ?o. } WHERE {',
      `  { GRAPH <${base}> { ?s ?p ?o. } }`,
      '  UNION',
      `  { GRAPH <meta:${base}> { ?s ?p ?o. } }`,
      '}',
    ]));
  });

  it('throws 404 if no metadata was found.', async(): Promise<void> => {
    // Clear triples array
    triples = [];
    await expect(accessor.getMetadata({ path: 'http://identifier' })).rejects.toThrow(NotFoundHttpError);

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery(
      'CONSTRUCT { ?s ?p ?o. } WHERE { GRAPH <meta:http://identifier> { ?s ?p ?o. } }',
    ));
  });

  it('overwrites the metadata when writing a container and updates parent.', async(): Promise<void> => {
    metadata = new RepresentationMetadata('http://test.com/container/',
      { [RDF.type]: [ toNamedNode(LDP.Resource), toNamedNode(LDP.Container) ]});
    await expect(accessor.writeContainer({ path: 'http://test.com/container/' }, metadata)).resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <meta:http://test.com/container/> { ?s ?p ?o. } };',
      'INSERT DATA {',
      '  GRAPH <meta:http://test.com/container/> {',
      '    <http://test.com/container/> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Resource>.',
      '    <http://test.com/container/> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Container>.',
      '  }',
      '  GRAPH <http://test.com/> { <http://test.com/> <http://www.w3.org/ns/ldp#contains> <http://test.com/container/>. }',
      '}',
    ]));
  });

  it('overwrites the data and metadata when writing a resource and updates parent.', async(): Promise<void> => {
    metadata = new RepresentationMetadata('http://test.com/container/resource',
      { [RDF.type]: [ toNamedNode(LDP.Resource) ]});
    await expect(accessor.writeDocument({ path: 'http://test.com/container/resource' }, data, metadata))
      .resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <http://test.com/container/resource> { ?s ?p ?o. } };',
      'DELETE WHERE { GRAPH <meta:http://test.com/container/resource> { ?s ?p ?o. } };',
      'INSERT DATA {',
      '  GRAPH <meta:http://test.com/container/resource> { <http://test.com/container/resource> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Resource>. }',
      '  GRAPH <http://test.com/container/> { <http://test.com/container/> <http://www.w3.org/ns/ldp#contains> <http://test.com/container/resource>. }',
      '  GRAPH <http://test.com/container/resource> { <http://name> <http://pred> "value". }',
      '}',
    ]));
  });

  it('overwrites the data and metadata when writing an empty resource.', async(): Promise<void> => {
    metadata = new RepresentationMetadata('http://test.com/container/resource',
      { [RDF.type]: [ toNamedNode(LDP.Resource) ]});
    const empty = guardedStreamFrom([]);
    await expect(accessor.writeDocument({ path: 'http://test.com/container/resource' }, empty, metadata))
      .resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <http://test.com/container/resource> { ?s ?p ?o. } };',
      'DELETE WHERE { GRAPH <meta:http://test.com/container/resource> { ?s ?p ?o. } };',
      'INSERT DATA {',
      '  GRAPH <meta:http://test.com/container/resource> { <http://test.com/container/resource> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Resource>. }',
      '  GRAPH <http://test.com/container/> { <http://test.com/container/> <http://www.w3.org/ns/ldp#contains> <http://test.com/container/resource>. }',
      '}',
    ]));
  });

  it('removes all references when deleting a resource.', async(): Promise<void> => {
    metadata = new RepresentationMetadata('http://test.com/container/',
      { [RDF.type]: [ toNamedNode(LDP.Resource), toNamedNode(LDP.Container) ]});
    await expect(accessor.deleteResource({ path: 'http://test.com/container/' })).resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <http://test.com/container/> { ?s ?p ?o. } };',
      'DELETE WHERE { GRAPH <meta:http://test.com/container/> { ?s ?p ?o. } };',
      'DELETE DATA { GRAPH <http://test.com/> { <http://test.com/> <http://www.w3.org/ns/ldp#contains> <http://test.com/container/>. } }',
    ]));
  });

  it('errors when trying to write to a metadata document.', async(): Promise<void> => {
    await expect(accessor.writeDocument({ path: 'meta:http://test.com/container/resource' }, data, metadata))
      .rejects.toThrow(new ConflictHttpError('Not allowed to create NamedNodes with the metadata extension.'));
  });

  it('errors when writing triples in a non-default graph.', async(): Promise<void> => {
    data = guardedStreamFrom(
      [ quad(namedNode('http://name'), namedNode('http://pred'), literal('value'), namedNode('badGraph!')) ],
    );
    await expect(accessor.writeDocument({ path: 'http://test.com/container/resource' }, data, metadata))
      .rejects.toThrow(new BadRequestHttpError('Only triples in the default graph are supported.'));
  });

  it('errors when the SPARQL endpoint fails during reading.', async(): Promise<void> => {
    fetchError = 'error';
    await expect(accessor.getMetadata({ path: 'http://identifier' })).rejects.toBe(fetchError);

    fetchError = new Error();
    await expect(accessor.getMetadata({ path: 'http://identifier' })).rejects.toThrow(fetchError);

    fetchError = undefined;
  });

  it('errors when the SPARQL endpoint fails during writing.', async(): Promise<void> => {
    const path = 'http://test.com/container/';
    metadata = new RepresentationMetadata(path);

    updateError = 'error';
    await expect(accessor.writeContainer({ path }, metadata)).rejects.toBe(updateError);

    updateError = new Error();
    await expect(accessor.writeContainer({ path }, metadata)).rejects.toThrow(updateError);

    updateError = undefined;
  });
});
