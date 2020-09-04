import { BasicRequestParser } from '../../../../src/ldp/http/BasicRequestParser';
import { BodyParser } from '../../../../src/ldp/http/BodyParser';
import { PreferenceParser } from '../../../../src/ldp/http/PreferenceParser';
import { TargetExtractor } from '../../../../src/ldp/http/TargetExtractor';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BasicRequestParser', (): void => {
  let targetExtractor: TargetExtractor;
  let bodyParser: BodyParser;
  let preferenceParser: PreferenceParser;
  let requestParser: BasicRequestParser;

  beforeEach(async(): Promise<void> => {
    targetExtractor = new StaticAsyncHandler(true, 'target' as any);
    bodyParser = new StaticAsyncHandler(true, 'body' as any);
    preferenceParser = new StaticAsyncHandler(true, 'preference' as any);
    requestParser = new BasicRequestParser({ targetExtractor, bodyParser, preferenceParser });
  });

  it('can handle input with both a URL and a method.', async(): Promise<void> => {
    await expect(requestParser.canHandle({ url: 'url', method: 'GET' } as any)).resolves.toBeUndefined();
  });

  it('rejects input with no URL.', async(): Promise<void> => {
    await expect(requestParser.canHandle({ method: 'GET' } as any)).rejects.toThrow('Missing URL.');
  });

  it('rejects input with no method.', async(): Promise<void> => {
    await expect(requestParser.canHandle({ url: 'url' } as any)).rejects.toThrow('Missing method.');
  });

  it('returns the output of all input parsers after calling handle.', async(): Promise<void> => {
    await expect(requestParser.handle({ url: 'url', method: 'GET' } as any)).resolves.toEqual({
      method: 'GET',
      target: 'target',
      preferences: 'preference',
      body: 'body',
    });
  });
});
