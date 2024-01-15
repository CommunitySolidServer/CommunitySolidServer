import 'jest-rdf';
import { Readable } from 'node:stream';
import arrayifyStream from 'arrayify-stream';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { DataFactory } from 'n3';
import type { Quad } from '@rdfjs/types';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { SparqlDataAccessor } from '../../../../src/storage/accessors/SparqlDataAccessor';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { SingleRootIdentifierStrategy } from '../../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { CONTENT_TYPE_TERM, LDP, RDF } from '../../../../src/util/Vocabularies';

const { literal, namedNode, quad } = DataFactory;

jest.mock('fetch-sparql-endpoint');

function simplifyQuery(query: string | string[]): string {
  if (Array.isArray(query)) {
    query = query.join(' ');
  }
  return query.replaceAll('\n', ' ').trim();
}

describe('A SparqlDataAccessor', (): void => {
  const endpoint = 'http://test.com/sparql';
  const base = 'http://test.com/';
  const identifierStrategy = new SingleRootIdentifierStrategy(base);
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
    accessor = new SparqlDataAccessor(endpoint, identifierStrategy);
  });

  it('can only handle quad data.', async(): Promise<void> => {
    let representation = new BasicRepresentation(data, metadata, true);
    await expect(accessor.canHandle(representation)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    representation = new BasicRepresentation(data, 'internal/newInternalType', false);
    await expect(accessor.canHandle(representation)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    representation = new BasicRepresentation(data, INTERNAL_QUADS, false);
    metadata.contentType = INTERNAL_QUADS;
    await expect(accessor.canHandle(representation)).resolves.toBeUndefined();
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
      quad(namedNode('http://identifier'), CONTENT_TYPE_TERM, literal(INTERNAL_QUADS)),
    ]);

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery(
      'CONSTRUCT { ?s ?p ?o. } WHERE { GRAPH <meta:http://identifier> { ?s ?p ?o. } }',
    ));
  });

  it('does not set the content-type for container metadata.', async(): Promise<void> => {
    metadata = await accessor.getMetadata({ path: 'http://container/' });
    expect(metadata.quads()).toBeRdfIsomorphic([
      quad(namedNode('this'), namedNode('a'), namedNode('triple')),
    ]);

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery(
      'CONSTRUCT { ?s ?p ?o. } WHERE { GRAPH <meta:http://container/> { ?s ?p ?o. } }',
    ));
  });

  it('requests the container data to find its children.', async(): Promise<void> => {
    triples = [ quad(namedNode('http://container/'), LDP.terms.contains, namedNode('http://container/child')) ];
    const children = [];
    for await (const child of accessor.getChildren({ path: 'http://container/' })) {
      children.push(child);
    }
    expect(children).toHaveLength(1);
    expect(children[0].identifier.value).toBe('http://container/child');

    expect(fetchTriples).toHaveBeenCalledTimes(1);
    expect(fetchTriples.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchTriples.mock.calls[0][1])).toBe(simplifyQuery(
      'CONSTRUCT { ?s ?p ?o. } WHERE { GRAPH <http://container/> { ?s ?p ?o. } }',
    ));
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
    metadata = new RepresentationMetadata(
      { path: 'http://test.com/container/' },
      { [RDF.type]: [ LDP.terms.Resource, LDP.terms.Container ]},
    );
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

  it('does not write containment triples when writing to a root container.', async(): Promise<void> => {
    metadata = new RepresentationMetadata(
      { path: 'http://test.com/' },
      { [RDF.type]: [ LDP.terms.Resource, LDP.terms.Container ]},
    );
    await expect(accessor.writeContainer({ path: 'http://test.com/' }, metadata)).resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <meta:http://test.com/> { ?s ?p ?o. } };',
      'INSERT DATA {',
      '  GRAPH <meta:http://test.com/> {',
      '    <http://test.com/> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Resource>.',
      '    <http://test.com/> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Container>.',
      '  }',
      '}',
    ]));
  });

  it('overwrites the data and metadata when writing a resource and updates parent.', async(): Promise<void> => {
    metadata = new RepresentationMetadata(
      { path: 'http://test.com/container/resource' },
      { [RDF.type]: [ LDP.terms.Resource ]},
    );
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
    metadata = new RepresentationMetadata(
      { path: 'http://test.com/container/resource' },
      { [RDF.type]: [ LDP.terms.Resource ]},
    );
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
    metadata = new RepresentationMetadata(
      { path: 'http://test.com/container/' },
      { [RDF.type]: [ LDP.terms.Resource, LDP.terms.Container ]},
    );
    await expect(accessor.deleteResource({ path: 'http://test.com/container/' })).resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <http://test.com/container/> { ?s ?p ?o. } };',
      'DELETE WHERE { GRAPH <meta:http://test.com/container/> { ?s ?p ?o. } };',
      'DELETE DATA { GRAPH <http://test.com/> { <http://test.com/> <http://www.w3.org/ns/ldp#contains> <http://test.com/container/>. } }',
    ]));
  });

  it('does not try to remove containment triples when deleting a root container.', async(): Promise<void> => {
    metadata = new RepresentationMetadata(
      { path: 'http://test.com/' },
      { [RDF.type]: [ LDP.terms.Resource, LDP.terms.Container ]},
    );
    await expect(accessor.deleteResource({ path: 'http://test.com/' })).resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <http://test.com/> { ?s ?p ?o. } };',
      'DELETE WHERE { GRAPH <meta:http://test.com/> { ?s ?p ?o. } }',
    ]));
  });

  it('errors when trying to write to a metadata document.', async(): Promise<void> => {
    const result = accessor.writeDocument({ path: 'meta:http://test.com/container/resource' }, data, metadata);
    await expect(result).rejects.toThrow(ConflictHttpError);
    await expect(result).rejects.toThrow('Not allowed to create NamedNodes with the metadata extension.');
  });

  it('errors when writing triples in a non-default graph.', async(): Promise<void> => {
    data = guardedStreamFrom(
      [ quad(namedNode('http://name'), namedNode('http://pred'), literal('value'), namedNode('badGraph!')) ],
    );
    const result = accessor.writeDocument({ path: 'http://test.com/container/resource' }, data, metadata);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Only triples in the default graph are supported.');
  });

  it('errors when the SPARQL endpoint fails during reading.', async(): Promise<void> => {
    fetchError = 'error';
    await expect(accessor.getMetadata({ path: 'http://identifier' })).rejects.toBe(fetchError);

    fetchError = new Error('read error');
    await expect(accessor.getMetadata({ path: 'http://identifier' })).rejects.toThrow(fetchError);

    fetchError = undefined;
  });

  it('errors when the SPARQL endpoint fails during writing.', async(): Promise<void> => {
    const identifier = { path: 'http://test.com/container/' };
    metadata = new RepresentationMetadata(identifier);

    updateError = 'error';
    await expect(accessor.writeContainer(identifier, metadata)).rejects.toBe(updateError);

    updateError = new Error('write error');
    await expect(accessor.writeContainer(identifier, metadata)).rejects.toThrow(updateError);

    updateError = undefined;
  });

  it('overwrites the metadata when writing metadata.', async(): Promise<void> => {
    const resourceIdentifier = { path: `${base}resource` };

    const newMetadata = new RepresentationMetadata(resourceIdentifier);
    newMetadata.addQuad(namedNode(`${base}a`), namedNode(`${base}b`), namedNode(`${base}c`));
    await expect(accessor.writeMetadata(resourceIdentifier, newMetadata)).resolves.toBeUndefined();

    expect(fetchUpdate).toHaveBeenCalledTimes(1);
    expect(fetchUpdate.mock.calls[0][0]).toBe(endpoint);
    expect(simplifyQuery(fetchUpdate.mock.calls[0][1])).toBe(simplifyQuery([
      'DELETE WHERE { GRAPH <meta:http://test.com/resource> { ?s ?p ?o. } };',
      'INSERT DATA {',
      'GRAPH <meta:http://test.com/resource> { <http://test.com/a> <http://test.com/b> <http://test.com/c>. }',
      '}',
    ]));
  });
});
