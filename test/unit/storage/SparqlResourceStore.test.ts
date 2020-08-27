import arrayifyStream from 'arrayify-stream';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { CONTAINS_PREDICATE } from '../../../src/util/MetadataController';
import { DataFactory } from 'n3';
import { fetch } from 'cross-fetch';
import { InteractionController } from '../../../src/util/InteractionController';
import { MethodNotAllowedHttpError } from '../../../src/util/errors/MethodNotAllowedHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { QuadRepresentation } from '../../../src/ldp/representation/QuadRepresentation';
import { Readable } from 'stream';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import { ResourceStoreController } from '../../../src/util/ResourceStoreController';
import { SparqlResourceStore } from '../../../src/storage/SparqlResourceStore';
import streamifyArray from 'streamify-array';
import { UnsupportedMediaTypeHttpError } from '../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { UrlContainerManager } from '../../../src/storage/UrlContainerManager';
import { v4 as uuid } from 'uuid';
import {
  CONTENT_TYPE_QUADS,
  DATA_TYPE_BINARY,
  DATA_TYPE_QUAD,
} from '../../../src/util/ContentTypes';
import { LINK_TYPE_LDP_BC, LINK_TYPE_LDPC, LINK_TYPE_LDPR } from '../../../src/util/LinkTypes';
import { namedNode, triple } from '@rdfjs/data-model';

const base = 'http://test.com/';
const sparqlEndpoint = 'http://localhost:8889/bigdata/sparql';

jest.mock('cross-fetch');
jest.mock('uuid');

describe('A SparqlResourceStore', (): void => {
  let store: SparqlResourceStore;
  let representation: QuadRepresentation;
  let spyOnSparqlResourceType: jest.SpyInstance<any, unknown[]>;

  const quad = triple(
    namedNode('http://test.com/s'),
    namedNode('http://test.com/p'),
    namedNode('http://test.com/o'),
  );

  const metadata = [ triple(
    namedNode('http://test.com/container'),
    CONTAINS_PREDICATE,
    namedNode('http://test.com/resource'),
  ) ];

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    store = new SparqlResourceStore(base, sparqlEndpoint, new ResourceStoreController(base,
      new InteractionController()), new UrlContainerManager(base));

    representation = {
      data: streamifyArray([ quad ]),
      dataType: DATA_TYPE_QUAD,
      metadata: { raw: [], linkRel: { type: new Set() }} as RepresentationMetadata,
    };

    spyOnSparqlResourceType = jest.spyOn(store as any, `getSparqlResourceType`);
    (uuid as jest.Mock).mockReturnValue('rand-om-st-ring');
  });

  /**
   * Create the mocked return values for the getSparqlResourceType function.
   * @param isContainer - Whether the mock should imitate a container.
   * @param isResource - Whether the mock should imitate a resource.
   */
  const mockResourceType = function(isContainer: boolean, isResource: boolean): void {
    let jsonResult: any;
    if (isContainer) {
      jsonResult = { results: { bindings: [{ type: { type: 'uri', value: LINK_TYPE_LDPC }}]}};
    } else if (isResource) {
      jsonResult = { results: { bindings: [{ type: { type: 'uri', value: LINK_TYPE_LDPR }}]}};
    }
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => jsonResult } as
      unknown as Response);
  };

  it('errors if a resource was not found.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    mockResourceType(false, false);
    const jsonResult = { results: { bindings: [{ type: { type: 'uri', value: 'unknown' }}]}};
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => jsonResult } as
      unknown as Response);

    // Tests
    await expect(store.getRepresentation({ path: `${base}wrong` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.addResource({ path: 'http://wrong.com/wrong' }, representation))
      .rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: 'wrong' })).rejects.toThrow(NotFoundHttpError);
    await expect(store.deleteResource({ path: `${base}wrong` })).rejects.toThrow(NotFoundHttpError);
    await expect(store.setRepresentation({ path: 'http://wrong.com/' }, representation))
      .rejects.toThrow(NotFoundHttpError);
  });

  it('(passes the SPARQL query to the endpoint for a PATCH request) errors for modifyResource.',
    async(): Promise<void> => {
      await expect(store.modifyResource()).rejects.toThrow(Error);

      // Temporary test to get the 100% coverage for already implemented but unused behaviour in sendSparqlUpdate,
      // because an error is thrown for now.
      (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);
      const sparql = 'INSERT DATA { GRAPH <https://example.com/foo/> { <https://example.com/foo/> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/.metadata>. } }';
      // eslint-disable-next-line dot-notation
      expect(await store['sendSparqlUpdate'](sparql)).toBeUndefined();

    // // Mock the cross-fetch functions.
    // (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);
    //
    // // Tests
    // const sparql = 'INSERT DATA { GRAPH <https://example.com/foo/> { <https://example.com/foo/> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/.metadata>. } }';
    // const algebra = translate(sparql, { quads: true });
    // const patch = {
    //   algebra,
    //   dataType: DATA_TYPE_BINARY,
    //   data: Readable.from(sparql),
    //   metadata: {
    //     raw: [],
    //     profiles: [],
    //     contentType: CONTENT_TYPE_SPARQL_UPDATE,
    //   },
    // };
    // await store.modifyResource({ path: `${base}foo` }, patch);
    // const init = {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': CONTENT_TYPE_SPARQL_UPDATE,
    //   },
    //   body: sparql,
    // };
    // expect(fetch as jest.Mock).toBeCalledWith(new Request(sparqlEndpoint), init);
    // expect(fetch as jest.Mock).toBeCalledTimes(1);
    });

  it('errors for wrong input data types.', async(): Promise<void> => {
    (representation as any).dataType = DATA_TYPE_BINARY;
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    await expect(store.setRepresentation({ path: `${base}foo` }, representation)).rejects
      .toThrow(UnsupportedMediaTypeHttpError);

    // This has not yet been fully implemented correctly.
    // const patch = {
    //   dataType: DATA_TYPE_QUAD,
    //   data: streamifyArray([ quad ]),
    //   metadata: {
    //     raw: [],
    //     profiles: [],
    //     contentType: CONTENT_TYPE_QUADS,
    //   },
    // };
    // await expect(store.modifyResource({ path: `${base}foo` }, patch)).rejects.toThrow(UnsupportedMediaTypeHttpError);
  });

  it('can write and read data.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    // Add
    mockResourceType(true, false);
    mockResourceType(false, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Mock: Get
    mockResourceType(false, true);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => ({ results: { bindings: [ quad ]}}) } as
      unknown as Response);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => ({ results: { bindings: metadata }}) } as
      unknown as Response);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, raw: []};
    const identifier = await store.addResource({ path: `${base}foo/` }, representation);
    expect(identifier.path).toBe(`${base}foo/rand-om-st-ring`);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}foo/`);
    expect(spyOnSparqlResourceType).toBeCalledWith(identifier.path);

    const result = await store.getRepresentation(identifier);
    expect(result).toEqual({
      dataType: representation.dataType,
      data: expect.any(Readable),
      metadata: {
        raw: metadata,
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    expect(spyOnSparqlResourceType).toBeCalledWith(identifier.path);
    expect(spyOnSparqlResourceType).toBeCalledTimes(3);
    expect(fetch as jest.Mock).toBeCalledTimes(6);
    await expect(arrayifyStream(result.data)).resolves.toEqual([ quad ]);
  });

  it('errors for container creation with path to non container.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    mockResourceType(false, true);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'myContainer/', raw: []};
    await expect(store.addResource({ path: `${base}foo` }, representation)).rejects.toThrow(MethodNotAllowedHttpError);
    expect(spyOnSparqlResourceType).toBeCalledTimes(1);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}foo/`);
  });

  it('errors 405 for POST invalid path ending without slash.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    mockResourceType(false, false);
    mockResourceType(false, false);
    mockResourceType(false, true);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'myContainer/', raw: []};
    await expect(store.addResource({ path: `${base}doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}doesnotexist/`);

    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, slug: 'file.txt', raw: []};
    await expect(store.addResource({ path: `${base}doesnotexist` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}doesnotexist/`);

    representation.metadata = { linkRel: { type: new Set() }, slug: 'file.txt', raw: []};
    await expect(store.addResource({ path: `${base}existingresource` }, representation))
      .rejects.toThrow(MethodNotAllowedHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}existingresource/`);
    expect(spyOnSparqlResourceType).toBeCalledTimes(3);
    expect(fetch as jest.Mock).toBeCalledTimes(3);
  });

  it('can write and read a container.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    // Add
    mockResourceType(false, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Mock: Get
    mockResourceType(true, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => ({ results: { bindings: [ quad ]}}) } as
      unknown as Response);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => ({ results: { bindings: metadata }}) } as
      unknown as Response);

    // Write container (POST)
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, slug: 'myContainer/', raw: metadata };
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path).toBe(`${base}myContainer/`);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}myContainer/`);
    expect(spyOnSparqlResourceType).toBeCalledTimes(1);
    expect(fetch as jest.Mock).toBeCalledTimes(2);

    // Read container
    const result = await store.getRepresentation(identifier);
    expect(result).toEqual({
      dataType: representation.dataType,
      data: expect.any(Readable),
      metadata: {
        raw: metadata,
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    expect(spyOnSparqlResourceType).toBeCalledWith(identifier.path);
    expect(spyOnSparqlResourceType).toBeCalledTimes(2);
    expect(fetch as jest.Mock).toBeCalledTimes(5);
    await expect(arrayifyStream(result.data)).resolves.toEqual([ quad, ...metadata ]);
  });

  it('can set data.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    const spyOnCreateResource = jest.spyOn(store as any, `createResource`);
    mockResourceType(false, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Tests
    await store.setRepresentation({ path: `${base}file.txt` }, representation);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}file.txt`);
    expect(spyOnSparqlResourceType).toBeCalledTimes(1);
    expect(spyOnCreateResource).toBeCalledWith(`${base}file.txt`, [ quad ], []);
    expect(spyOnCreateResource).toBeCalledTimes(1);
    expect(fetch as jest.Mock).toBeCalledTimes(2);
  });

  it('can delete data.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    // Delete
    const spyOnDeleteSparqlDocument = jest.spyOn(store as any, `deleteSparqlDocument`);
    mockResourceType(false, true);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Mock: Get
    mockResourceType(false, false);

    // Tests
    await store.deleteResource({ path: `${base}file.txt` });
    expect(spyOnDeleteSparqlDocument).toBeCalledWith(`${base}file.txt`);
    expect(spyOnDeleteSparqlDocument).toBeCalledTimes(1);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}file.txt`);

    await expect(store.getRepresentation({ path: `${base}file.txt` })).rejects.toThrow(NotFoundHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}file.txt`);
    expect(spyOnSparqlResourceType).toBeCalledTimes(2);
  });

  it('creates intermediate container when POSTing resource to path ending with slash.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    const spyOnCreateContainer = jest.spyOn(store as any, `createContainer`);
    const spyOnCreateResource = jest.spyOn(store as any, `createResource`);
    mockResourceType(false, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);
    mockResourceType(false, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, slug: 'file.txt', raw: []};
    const identifier = await store.addResource({ path: `${base}doesnotexistyet/` }, representation);
    expect(identifier.path).toBe(`${base}doesnotexistyet/file.txt`);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}doesnotexistyet/`);
    expect(spyOnCreateContainer).toBeCalledWith(`${base}doesnotexistyet/`);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}doesnotexistyet/file.txt`);
    expect(spyOnCreateResource).toBeCalledWith(`${base}doesnotexistyet/file.txt`, [ quad ], []);
    expect(spyOnCreateContainer).toBeCalledTimes(1);
    expect(spyOnCreateResource).toBeCalledTimes(1);
    expect(spyOnSparqlResourceType).toBeCalledTimes(2);
    expect(fetch as jest.Mock).toBeCalledTimes(4);
  });

  it('errors when deleting root container.', async(): Promise<void> => {
    // Tests
    await expect(store.deleteResource({ path: base })).rejects.toThrow(MethodNotAllowedHttpError);
  });

  it('errors when deleting non empty container.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    const spyOnIsEmptyContainer = jest.spyOn(store as any, `isEmptyContainer`);
    mockResourceType(true, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => ({ boolean: true }) } as
      unknown as Response);

    // Tests
    await expect(store.deleteResource({ path: `${base}notempty/` })).rejects.toThrow(ConflictHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}notempty/`);
    expect(spyOnIsEmptyContainer).toBeCalledWith(`${base}notempty/`);
  });

  it('can overwrite representation with PUT.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    const spyOnCreateResource = jest.spyOn(store as any, `createResource`);
    mockResourceType(false, true);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, raw: []};
    await store.setRepresentation({ path: `${base}alreadyexists.txt` }, representation);
    expect(spyOnCreateResource).toBeCalledWith(`${base}alreadyexists.txt`, [ quad ], []);
    expect(spyOnCreateResource).toBeCalledTimes(1);
    expect(spyOnSparqlResourceType).toBeCalledTimes(1);
    expect(fetch as jest.Mock).toBeCalledTimes(2);
  });

  it('errors when overwriting container with PUT.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    mockResourceType(true, false);
    mockResourceType(false, true);
    mockResourceType(true, false);

    // Tests
    await expect(store.setRepresentation({ path: `${base}alreadyexists` }, representation)).rejects
      .toThrow(ConflictHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}alreadyexists`);
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, raw: []};
    await expect(store.setRepresentation({ path: `${base}alreadyexists/` }, representation)).rejects
      .toThrow(ConflictHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}alreadyexists/`);
    await expect(store.setRepresentation({ path: `${base}alreadyexists/` }, representation)).rejects
      .toThrow(ConflictHttpError);
    expect(spyOnSparqlResourceType).toBeCalledWith(`${base}alreadyexists/`);
    expect(spyOnSparqlResourceType).toBeCalledTimes(3);
    expect(fetch as jest.Mock).toBeCalledTimes(3);
  });

  it('can overwrite container metadata with POST.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    const spyOnOverwriteContainerMetadata = jest.spyOn(store as any, `overwriteContainerMetadata`);
    mockResourceType(true, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) },
      raw: metadata,
      slug: 'alreadyexists/' };
    await store.addResource({ path: base }, representation);
    expect(spyOnOverwriteContainerMetadata).toBeCalledWith(`${base}alreadyexists/`, metadata);
    expect(spyOnOverwriteContainerMetadata).toBeCalledTimes(1);
    expect(spyOnSparqlResourceType).toBeCalledTimes(1);
    expect(fetch as jest.Mock).toBeCalledTimes(2);
  });

  it('can delete empty container.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    const spyOnDeleteSparqlContainer = jest.spyOn(store as any, `deleteSparqlContainer`);
    mockResourceType(true, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: (): any => ({ boolean: false }) } as
      unknown as Response);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Tests
    await store.deleteResource({ path: `${base}foo/` });
    expect(spyOnDeleteSparqlContainer).toBeCalledWith(`${base}foo/`);
    expect(spyOnDeleteSparqlContainer).toBeCalledTimes(1);
    expect(spyOnSparqlResourceType).toBeCalledTimes(1);
    expect(fetch as jest.Mock).toBeCalledTimes(3);
  });

  it('errors when passing quads not in the default graph.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    mockResourceType(false, false);

    // Tests
    const namedGraphQuad = DataFactory.quad(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
      namedNode('http://test.com/g'),
    );
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, raw: []};
    representation.data = streamifyArray([ namedGraphQuad ]);
    await expect(store.addResource({ path: base }, representation)).rejects.toThrow(ConflictHttpError);
  });

  it('errors when getting bad response from server.', async(): Promise<void> => {
    // Mock the cross-fetch functions.
    mockResourceType(false, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 400 } as unknown as Response);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDPR ]) }, raw: []};
    await expect(store.setRepresentation({ path: `${base}foo.txt` }, representation)).rejects.toThrow(Error);
  });

  it('creates container with random UUID when POSTing without slug header.', async(): Promise<void> => {
    // Mock the uuid and cross-fetch functions.
    mockResourceType(false, false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 200 } as unknown as Response);

    // Tests
    representation.metadata = { linkRel: { type: new Set([ LINK_TYPE_LDP_BC ]) }, raw: []};
    const identifier = await store.addResource({ path: base }, representation);
    expect(identifier.path).toBe(`${base}rand-om-st-ring/`);
    expect(spyOnSparqlResourceType).toBeCalledTimes(1);
    expect(fetch as jest.Mock).toBeCalledTimes(2);
    expect(uuid as jest.Mock).toBeCalledTimes(1);
  });
});
