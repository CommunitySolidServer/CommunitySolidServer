import arrayifyStream from 'arrayify-stream';
import { HttpRequest } from '../../../../src/server/HttpRequest';
import { SimpleBodyParser } from '../../../../src/ldp/http/SimpleBodyParser';
import streamifyArray from 'streamify-array';
import { StreamParser } from 'n3';
import { UnsupportedMediaTypeHttpError } from '../../../../src/util/errors/UnsupportedMediaTypeHttpError';
import { namedNode, triple } from '@rdfjs/data-model';

const contentTypes = [
  'application/n-quads',
  'application/trig',
  'application/n-triples',
  'text/turtle',
  'text/n3',
];

describe('A SimpleBodyparser', (): void => {
  const bodyParser = new SimpleBodyParser();

  it('rejects input with unsupported content type.', async(): Promise<void> => {
    await expect(bodyParser.canHandle({ headers: { 'content-type': 'application/rdf+xml' }} as HttpRequest))
      .rejects.toThrow(new UnsupportedMediaTypeHttpError('This parser only supports RDF data.'));
  });

  it('accepts input with no content type.', async(): Promise<void> => {
    await expect(bodyParser.canHandle({ headers: { }} as HttpRequest)).resolves.toBeUndefined();
  });

  it('accepts turtle and similar content types.', async(): Promise<void> => {
    for (const type of contentTypes) {
      await expect(bodyParser.canHandle({ headers: { 'content-type': type }} as HttpRequest)).resolves.toBeUndefined();
    }
  });

  it('returns empty output if there was no content-type.', async(): Promise<void> => {
    await expect(bodyParser.handle({ headers: { }} as HttpRequest)).resolves.toBeUndefined();
  });

  it('returns a stream of quads if there was data.', async(): Promise<void> => {
    const input = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    input.headers = { 'content-type': 'text/turtle' };
    const result = await bodyParser.handle(input);
    expect(result).toEqual({
      data: expect.any(StreamParser),
      dataType: 'quad',
      metadata: {
        contentType: 'text/turtle',
        profiles: [],
        raw: [],
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });
});
