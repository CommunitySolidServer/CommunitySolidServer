import { namedNode, quad } from '@rdfjs/data-model';
import arrayifyStream from 'arrayify-stream';
import { Algebra } from 'sparqlalgebrajs';
import * as algebra from 'sparqlalgebrajs';
import streamifyArray from 'streamify-array';
import { SparqlUpdateBodyParser } from '../../../../src/ldp/http/SparqlUpdateBodyParser';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';

describe('A SparqlUpdateBodyParser', (): void => {
  const bodyParser = new SparqlUpdateBodyParser();

  it('only accepts application/sparql-update content.', async(): Promise<void> => {
    await expect(bodyParser.canHandle({ headers: {}} as HttpRequest)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    await expect(bodyParser.canHandle({ headers: { 'content-type': 'text/plain' }} as HttpRequest))
      .rejects.toThrow(UnsupportedMediaTypeHttpError);
    await expect(bodyParser.canHandle({ headers: { 'content-type': 'application/sparql-update' }} as HttpRequest))
      .resolves.toBeUndefined();
  });

  it('errors when handling invalid SPARQL updates.', async(): Promise<void> => {
    await expect(bodyParser.handle(streamifyArray([ 'VERY INVALID UPDATE' ]) as HttpRequest))
      .rejects.toThrow(UnsupportedHttpError);
  });

  it('errors when receiving an unexpected error.', async(): Promise<void> => {
    const mock = jest.spyOn(algebra, 'translate').mockImplementationOnce((): any => {
      throw 'apple';
    });
    await expect(bodyParser.handle(streamifyArray(
      [ 'DELETE DATA { <http://test.com/s> <http://test.com/p> <http://test.com/o>}' ],
    ) as HttpRequest)).rejects.toThrow(UnsupportedHttpError);
    mock.mockRestore();
  });

  it('converts SPARQL updates to algebra.', async(): Promise<void> => {
    const result = await bodyParser.handle(streamifyArray(
      [ 'DELETE DATA { <http://test.com/s> <http://test.com/p> <http://test.com/o>}' ],
    ) as HttpRequest);
    expect(result.algebra.type).toBe(Algebra.types.DELETE_INSERT);
    expect((result.algebra as Algebra.DeleteInsert).delete).toBeRdfIsomorphic([ quad(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toEqual('application/sparql-update');

    // Workaround for Node 10 not exposing objectMode
    expect((await arrayifyStream(result.data)).join('')).toEqual(
      'DELETE DATA { <http://test.com/s> <http://test.com/p> <http://test.com/o>}',
    );
  });
});
