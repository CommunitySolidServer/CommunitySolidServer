import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { BasicRequestParser } from '../../src/ldp/http/BasicRequestParser';
import { BasicConditionsParser } from '../../src/ldp/http/conditions/BasicConditionsParser';
import { ContentTypeParser } from '../../src/ldp/http/metadata/ContentTypeParser';
import { OriginalUrlExtractor } from '../../src/ldp/http/OriginalUrlExtractor';
import { RawBodyParser } from '../../src/ldp/http/RawBodyParser';
import { RepresentationMetadata } from '../../src/ldp/representation/RepresentationMetadata';
import type { HttpRequest } from '../../src/server/HttpRequest';
import { BasicConditions } from '../../src/storage/BasicConditions';
import { guardedStreamFrom } from '../../src/util/StreamUtil';

describe('A BasicRequestParser with simple input parsers', (): void => {
  const targetExtractor = new OriginalUrlExtractor();
  const preferenceParser = new AcceptPreferenceParser();
  const metadataParser = new ContentTypeParser();
  const conditionsParser = new BasicConditionsParser();
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
      conditions: new BasicConditions({
        unmodifiedSince: new Date('2015-10-21T07:28:00.000Z'),
        notMatchesETag: [ '12345' ],
      }),
      body: {
        data: expect.any(Readable),
        binary: true,
        metadata: expect.any(RepresentationMetadata),
      },
    });
    expect(result.body?.metadata.contentType).toEqual('text/turtle');

    await expect(arrayifyStream(result.body!.data)).resolves.toEqual(
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
  });
});
