import 'jest-rdf';
import type { Server } from 'http';
import { join } from 'path';
import arrayifyStream from 'arrayify-stream';
import fetch from 'cross-fetch';
import { DataFactory, StreamParser } from 'n3';
import type { Quad } from 'n3';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { instantiateFromConfig } from './Config';
const { literal, namedNode, quad } = DataFactory;

const port = 6003;
const baseUrl = `http://localhost:${port}/`;

describe('A server', (): void => {
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:ServerFactory', 'server-without-auth.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:baseUrl': baseUrl,
        'urn:solid-server:default:variable:podTemplateFolder': join(__dirname, '../assets/templates'),
      },
    ) as HttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('creates a container.', async(): Promise<void> => {
    const slug = 'my-container';
    let response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'text/turtle',
        link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        slug,
      },
      body: '<> <http://www.w3.org/2000/01/rdf-schema#label> "My Container" .',
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(`${baseUrl}${slug}/`);

    response = await fetch(`${baseUrl}${slug}/`, {
      headers: {
        accept: 'text/turtle',
      },
    });
    expect(response.status).toBe(200);

    const quads: Quad[] = await arrayifyStream((response.body as any).pipe(new StreamParser({ baseIRI: baseUrl })));
    expect(quads.some((entry): boolean => entry.equals(quad(
      namedNode(`${baseUrl}${slug}/`),
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      literal('My Container'),
    )))).toBeTruthy();
  });
});
