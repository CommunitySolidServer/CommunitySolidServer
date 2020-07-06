import { AcceptPreferenceParser } from '../../src/ldp/http/AcceptPreferenceParser';
import arrayifyStream from 'arrayify-stream';
import { HttpRequest } from '../../src/server/HttpRequest';
import { SimpleBodyParser } from '../../src/ldp/http/SimpleBodyParser';
import { SimpleRequestParser } from '../../src/ldp/http/SimpleRequestParser';
import { SimpleTargetExtractor } from '../../src/ldp/http/SimpleTargetExtractor';
import streamifyArray from 'streamify-array';
import { StreamParser } from 'n3';
import { namedNode, triple } from '@rdfjs/data-model';

describe('A SimpleRequestParser with simple input parsers', (): void => {
  const targetExtractor = new SimpleTargetExtractor();
  const bodyParser = new SimpleBodyParser();
  const preferenceParser = new AcceptPreferenceParser();
  const requestParser = new SimpleRequestParser({ targetExtractor, bodyParser, preferenceParser });

  it('can parse an incoming request.', async(): Promise<void> => {
    const request = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    request.method = 'POST';
    request.url = 'http://test.com/';
    request.headers = {
      accept: 'text/turtle; q=0.8',
      'accept-language': 'en-gb, en;q=0.5',
      'content-type': 'text/turtle',
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
        data: expect.any(StreamParser),
        dataType: 'quad',
        metadata: {
          contentType: 'text/turtle',
          profiles: [],
          raw: [],
        },
      },
    });

    await expect(arrayifyStream(result.body.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });
});
