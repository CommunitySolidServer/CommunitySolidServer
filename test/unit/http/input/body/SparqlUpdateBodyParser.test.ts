import 'jest-rdf';
import { namedNode, quad } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import { Algebra } from 'sparqlalgebrajs';
import * as algebra from 'sparqlalgebrajs';
import type { BodyParserArgs } from '../../../../../src/http/input/body/BodyParser';
import { SparqlUpdateBodyParser } from '../../../../../src/http/input/body/SparqlUpdateBodyParser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { guardedStreamFrom } from '../../../../../src/util/StreamUtil';

describe('A SparqlUpdateBodyParser', (): void => {
  const bodyParser = new SparqlUpdateBodyParser();
  let input: BodyParserArgs;

  beforeEach(async(): Promise<void> => {
    input = { request: { headers: {}} as HttpRequest, metadata: new RepresentationMetadata() };
  });

  it('only accepts application/sparql-update content.', async(): Promise<void> => {
    await expect(bodyParser.canHandle(input)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    input.metadata.contentType = 'text/plain';
    await expect(bodyParser.canHandle(input)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    input.metadata.contentType = 'application/sparql-update;charset=utf-8';
    await expect(bodyParser.canHandle(input)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    input.metadata.contentType = 'application/sparql-update ; foo=bar';
    await expect(bodyParser.canHandle(input)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    input.metadata.contentType = 'application/sparql-update';
    await expect(bodyParser.canHandle(input)).resolves.toBeUndefined();
  });

  it('errors when handling invalid SPARQL updates.', async(): Promise<void> => {
    input.request = guardedStreamFrom([ 'VERY INVALID UPDATE' ]) as HttpRequest;
    await expect(bodyParser.handle(input)).rejects.toThrow(BadRequestHttpError);
  });

  it('errors when receiving an unexpected error.', async(): Promise<void> => {
    const mock = jest.spyOn(algebra, 'translate').mockImplementationOnce((): any => {
      throw 'apple';
    });
    input.request = guardedStreamFrom(
      [ 'DELETE DATA { <http://test.com/s> <http://test.com/p> <http://test.com/o> }' ],
    ) as HttpRequest;
    await expect(bodyParser.handle(input)).rejects.toThrow(BadRequestHttpError);
    mock.mockRestore();
  });

  it('converts SPARQL updates to algebra.', async(): Promise<void> => {
    input.request = guardedStreamFrom(
      [ 'DELETE DATA { <http://test.com/s> <http://test.com/p> <http://test.com/o> }' ],
    ) as HttpRequest;
    const result = await bodyParser.handle(input);
    expect(result.algebra.type).toBe(Algebra.types.DELETE_INSERT);
    expect((result.algebra as Algebra.DeleteInsert).delete).toBeRdfIsomorphic([ quad(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
    expect(result.binary).toBe(true);
    expect(result.metadata).toBe(input.metadata);

    expect(await arrayifyStream(result.data)).toEqual(
      [ 'DELETE DATA { <http://test.com/s> <http://test.com/p> <http://test.com/o> }' ],
    );
  });

  it('accepts relative references.', async(): Promise<void> => {
    input.request = guardedStreamFrom(
      [ 'INSERT DATA { <#it> <http://test.com/p> <http://test.com/o> }' ],
    ) as HttpRequest;
    input.metadata.identifier = namedNode('http://test.com/my-document.ttl');
    const result = await bodyParser.handle(input);
    expect(result.algebra.type).toBe(Algebra.types.DELETE_INSERT);
    expect((result.algebra as Algebra.DeleteInsert).insert).toBeRdfIsomorphic([ quad(
      namedNode('http://test.com/my-document.ttl#it'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
    expect(result.binary).toBe(true);
    expect(result.metadata).toBe(input.metadata);

    expect(await arrayifyStream(result.data)).toEqual(
      [ 'INSERT DATA { <#it> <http://test.com/p> <http://test.com/o> }' ],
    );
  });
});
