import { Algebra } from 'sparqlalgebrajs';
import { HttpRequest } from '../../../../src/server/HttpRequest';
import { SimpleSparqlUpdateBodyParser } from '../../../../src/ldp/http/SimpleSparqlUpdateBodyParser';
import streamifyArray from 'streamify-array';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { namedNode, quad } from '@rdfjs/data-model';

describe('A SimpleSparqlUpdateBodyParser', (): void => {
  const bodyParser = new SimpleSparqlUpdateBodyParser();

  it('only accepts application/sparql-update content.', async(): Promise<void> => {
    await expect(bodyParser.canHandle({ headers: {}} as HttpRequest)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    await expect(bodyParser.canHandle({ headers: { 'content-type': 'text/plain' }} as HttpRequest)).rejects.toThrow(UnsupportedMediaTypeHttpError);
    await expect(bodyParser.canHandle({ headers: { 'content-type': 'application/sparql-update' }} as HttpRequest)).resolves.toBeUndefined();
  });

  it('errors when handling invalid SPARQL updates.', async(): Promise<void> => {
    await expect(bodyParser.handle(streamifyArray([ 'VERY INVALID UPDATE' ]) as HttpRequest)).rejects.toThrow(UnsupportedHttpError);
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
    expect(result.dataType).toBe('sparql-algebra');
    expect(result.raw).toBe('DELETE DATA { <http://test.com/s> <http://test.com/p> <http://test.com/o>}');
    expect(result.metadata).toEqual({
      raw: [],
      profiles: [],
      contentType: 'application/sparql-update',
    });
    expect((): any => result.data).toThrow('Body already parsed');
  });
});
