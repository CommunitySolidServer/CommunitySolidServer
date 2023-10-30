import { Readable } from 'node:stream';
import arrayifyStream from 'arrayify-stream';
import { BasicETagHandler, SingleRootIdentifierStrategy } from '../../src';
import { BasicRequestParser } from '../../src/http/input/BasicRequestParser';
import { RawBodyParser } from '../../src/http/input/body/RawBodyParser';
import { BasicConditionsParser } from '../../src/http/input/conditions/BasicConditionsParser';
import { OriginalUrlExtractor } from '../../src/http/input/identifier/OriginalUrlExtractor';
import { ContentTypeParser } from '../../src/http/input/metadata/ContentTypeParser';
import { AcceptPreferenceParser } from '../../src/http/input/preferences/AcceptPreferenceParser';
import { RepresentationMetadata } from '../../src/http/representation/RepresentationMetadata';
import type { HttpRequest } from '../../src/server/HttpRequest';
import { guardedStreamFrom } from '../../src/util/StreamUtil';

describe('A BasicRequestParser with simple input parsers', (): void => {
  const identifierStrategy = new SingleRootIdentifierStrategy('http://test.com/');
  const targetExtractor = new OriginalUrlExtractor({ identifierStrategy });
  const preferenceParser = new AcceptPreferenceParser();
  const metadataParser = new ContentTypeParser();
  const conditionsParser = new BasicConditionsParser(new BasicETagHandler());
  const bodyParser = new RawBodyParser();
  const requestParser = new BasicRequestParser(
    { targetExtractor, preferenceParser, metadataParser, conditionsParser, bodyParser },
  );

  it('can parse an incoming request.', async(): Promise<void> => {
    const request = guardedStreamFrom([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    request.method = 'POST';
    request.url = '/';
    request.headers = {
      accept: 'text/turtle; q=0.8',
      'accept-language': 'en-gb, en;q=0.5',
      'content-type': 'text/turtle',
      'if-unmodified-since': 'Wed, 21 Oct 2015 07:28:00 UTC',
      'if-none-match': '12345',
      'transfer-encoding': 'chunked',
      host: 'test.com',
    };

    const result = await requestParser.handle(request);
    expect(result).toEqual({
      method: 'POST',
      target: { path: 'http://test.com/' },
      preferences: {
        type: { 'text/turtle': 0.8 },
        language: { 'en-gb': 1, en: 0.5 },
      },
      conditions: expect.objectContaining({
        unmodifiedSince: new Date('2015-10-21T07:28:00.000Z'),
        notMatchesETag: [ '12345' ],
      }),
      body: {
        data: expect.any(Readable),
        binary: true,
        metadata: expect.any(RepresentationMetadata),
      },
    });
    expect(result.body?.metadata.contentType).toBe('text/turtle');

    await expect(arrayifyStream(result.body.data)).resolves.toEqual(
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
  });
});
