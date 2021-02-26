import 'jest-rdf';
import * as url from 'url';
import { namedNode, quad } from '@rdfjs/data-model';
import { Parser } from 'n3';
import type { MockResponse } from 'node-mocks-http';
import type { HttpHandler } from '../../src/server/HttpHandler';
import { LDP } from '../../src/util/Vocabularies';
import { performRequest } from '../util/Util';
import { BASE, instantiateFromConfig } from './Config';

describe('An integrated AuthenticatedLdpHandler', (): void => {
  let handler: HttpHandler;

  beforeAll(async(): Promise<void> => {
    handler = await instantiateFromConfig(
      'urn:solid-server:default:LdpHandler', 'server-without-auth.json', {
        'urn:solid-server:default:variable:baseUrl': BASE,
      },
    ) as HttpHandler;

    // The tests depend on there being a root container here
    await performRequest(
      handler,
      new URL('http://test.com/'),
      'PUT',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ ],
    );
  });

  it('can add, read and delete data based on incoming requests.', async(): Promise<void> => {
    // POST
    let requestUrl = new URL('http://test.com/');
    let response: MockResponse<any> = await performRequest(
      handler,
      requestUrl,
      'POST',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
    expect(response.statusCode).toBe(201);
    expect(response._getData()).toHaveLength(0);
    const id = response._getHeaders().location;
    expect(id).toContain(url.format(requestUrl));

    // GET
    requestUrl = new URL(id);
    response = await performRequest(
      handler,
      requestUrl,
      'GET',
      { accept: 'text/turtle' },
      [],
    );
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toContain(
      '<http://test.com/s> <http://test.com/p> <http://test.com/o>.',
    );
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${id}.acl>; rel="acl"`);

    // DELETE
    response = await performRequest(handler, requestUrl, 'DELETE', {}, []);
    expect(response.statusCode).toBe(205);
    expect(response._getData()).toHaveLength(0);

    // GET
    response = await performRequest(
      handler,
      requestUrl,
      'GET',
      { accept: 'text/turtle' },
      [],
    );
    expect(response.statusCode).toBe(404);
    expect(response._getData()).toContain('NotFoundHttpError');
  });

  it('can handle simple SPARQL updates.', async(): Promise<void> => {
    // POST
    let requestUrl = new URL('http://test.com/');
    let response: MockResponse<any> = await performRequest(
      handler,
      requestUrl,
      'POST',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
        '<s2> <http://test.com/p2> <http://test.com/o2>.' ],
    );
    expect(response.statusCode).toBe(201);
    expect(response._getData()).toHaveLength(0);
    const id = response._getHeaders().location;
    expect(id).toContain(url.format(requestUrl));

    // PATCH
    requestUrl = new URL(id);
    response = await performRequest(
      handler,
      requestUrl,
      'PATCH',
      { 'content-type': 'application/sparql-update', 'transfer-encoding': 'chunked' },
      [ 'DELETE { <s1> <http://test.com/p1> <http://test.com/o1> }',
        'INSERT {<s3> <http://test.com/p3> <http://test.com/o3>}',
        'WHERE {}',
      ],
    );
    expect(response.statusCode).toBe(205);
    expect(response._getData()).toHaveLength(0);

    // PATCH using a content-type header with charset
    requestUrl = new URL(id);
    response = await performRequest(
      handler,
      requestUrl,
      'PATCH',
      { 'content-type': ' application/sparql-update ; charset=UTF-8', 'transfer-encoding': 'chunked' },
      [ 'DELETE { <s1> <http://test.com/p1> <http://test.com/o1> }',
        'INSERT {<s3> <http://test.com/p3> <http://test.com/o3>}',
        'WHERE {}',
      ],
    );
    expect(response.statusCode).toBe(205);
    expect(response._getData()).toHaveLength(0);

    // GET
    response = await performRequest(handler, requestUrl, 'GET', { accept: 'text/turtle' }, []);
    expect(response.statusCode).toBe(200);
    expect(response._getData()).toContain(
      '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
    );
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${id}.acl>; rel="acl"`);
    const parser = new Parser();
    let triples = parser.parse(response._getData());
    expect(triples).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/s2'),
        namedNode('http://test.com/p2'),
        namedNode('http://test.com/o2'),
      ),
      quad(
        namedNode('http://test.com/s3'),
        namedNode('http://test.com/p3'),
        namedNode('http://test.com/o3'),
      ),
    ]);

    // PATCH
    response = await performRequest(
      handler,
      requestUrl,
      'PATCH',
      { 'content-type': 'application/sparql-update', 'transfer-encoding': 'chunked' },
      [ 'DELETE DATA { <s2> <http://test.com/p2> <http://test.com/o2> }; ',
        'INSERT DATA {<s4> <http://test.com/p4> <http://test.com/o4>}',
      ],
    );
    expect(response.statusCode).toBe(205);
    expect(response._getData()).toHaveLength(0);

    // GET
    response = await performRequest(handler, requestUrl, 'GET', { accept: 'text/turtle' }, []);
    expect(response.statusCode).toBe(200);
    triples = parser.parse(response._getData());
    expect(triples).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/s3'),
        namedNode('http://test.com/p3'),
        namedNode('http://test.com/o3'),
      ),
      quad(
        namedNode('http://test.com/s4'),
        namedNode('http://test.com/p4'),
        namedNode('http://test.com/o4'),
      ),
    ]);
  });

  it('should overwrite the content on PUT request.', async(): Promise<void> => {
    // POST
    let requestUrl = new URL('http://test.com/');
    let response: MockResponse<any> = await performRequest(
      handler,
      requestUrl,
      'POST',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [
        '<http://test.com/s1> <http://test.com/p1> <http://test.com/o1>.',
        '<http://test.com/s2> <http://test.com/p2> <http://test.com/o2>.',
      ],
    );
    expect(response.statusCode).toBe(201);
    expect(response._getData()).toHaveLength(0);
    const id = response._getHeaders().location;
    expect(id).toContain(url.format(requestUrl));

    // PUT
    requestUrl = new URL(id);
    response = await performRequest(
      handler,
      requestUrl,
      'PUT',
      { 'content-type': 'text/turtle', 'transfer-encoding': 'chunked' },
      [ '<http://test.com/s3> <http://test.com/p3> <http://test.com/o3>.' ],
    );
    expect(response.statusCode).toBe(205);
    expect(response._getData()).toHaveLength(0);

    // GET
    requestUrl = new URL(id);
    response = await performRequest(
      handler,
      requestUrl,
      'GET',
      { accept: 'text/turtle' },
      [],
    );
    expect(response.statusCode).toBe(200);
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${id}.acl>; rel="acl"`);
    const parser = new Parser();
    const triples = parser.parse(response._getData());
    expect(triples).toBeRdfIsomorphic([
      quad(
        namedNode('http://test.com/s3'),
        namedNode('http://test.com/p3'),
        namedNode('http://test.com/o3'),
      ),
    ]);
  });
});
