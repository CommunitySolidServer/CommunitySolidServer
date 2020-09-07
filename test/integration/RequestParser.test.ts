import { Readable } from 'stream';
import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import { BasicRequestParser } from '../../src/ldp/http/BasicRequestParser';
import { BasicTargetExtractor } from '../../src/ldp/http/BasicTargetExtractor';
import { RawBodyParser } from '../../src/ldp/http/RawBodyParser';
import { RepresentationMetadata } from '../../src/ldp/representation/RepresentationMetadata';
import { HttpRequest } from '../../src/server/HttpRequest';
import { CONTENT_TYPE } from '../../src/util/MetadataTypes';

describe('A BasicRequestParser with simple input parsers', (): void => {
  const targetExtractor = new BasicTargetExtractor();
  const bodyParser = new RawBodyParser();
  const preferenceParser = new AcceptPreferenceParser();
  const requestParser = new BasicRequestParser({ targetExtractor, bodyParser, preferenceParser });

  it('can parse an incoming request.', async(): Promise<void> => {
    const request = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    request.method = 'POST';
    request.url = '/';
    request.headers = {
      accept: 'text/turtle; q=0.8',
      'accept-language': 'en-gb, en;q=0.5',
      'content-type': 'text/turtle',
      'transfer-encoding': 'chunked',
      host: 'test.com',
    };

    const result = await requestParser.handle(request);
    expect(result).toEqual({
      method: 'POST',
      target: { path: 'http://test.com/' },
      preferences: {
        type: [{ value: 'text/turtle', weight: 0.8 }],
        language: [{ value: 'en-gb', weight: 1 }, { value: 'en', weight: 0.5 }],
      },
      body: {
        data: expect.any(Readable),
        binary: true,
        metadata: expect.any(RepresentationMetadata),
      },
    });
    expect(result.body?.metadata.get(CONTENT_TYPE)?.value).toEqual('text/turtle');

    await expect(arrayifyStream(result.body!.data)).resolves.toEqual(
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
  });
});
