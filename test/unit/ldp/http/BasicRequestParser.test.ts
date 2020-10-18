import { BasicRequestParser } from '../../../../src/ldp/http/BasicRequestParser';
import type { BodyParser } from '../../../../src/ldp/http/BodyParser';
import type { MetadataExtractor } from '../../../../src/ldp/http/metadata/MetadataExtractor';
import type { PreferenceParser } from '../../../../src/ldp/http/PreferenceParser';
import type { TargetExtractor } from '../../../../src/ldp/http/TargetExtractor';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BasicRequestParser', (): void => {
  let targetExtractor: TargetExtractor;
  let preferenceParser: PreferenceParser;
  let metadataExtractor: MetadataExtractor;
  let bodyParser: BodyParser;
  let requestParser: BasicRequestParser;

  beforeEach(async(): Promise<void> => {
    targetExtractor = new StaticAsyncHandler(true, 'target' as any);
    preferenceParser = new StaticAsyncHandler(true, 'preference' as any);
    metadataExtractor = new StaticAsyncHandler(true, 'metadata' as any);
    bodyParser = new StaticAsyncHandler(true, 'body' as any);
    requestParser = new BasicRequestParser({ targetExtractor, preferenceParser, metadataExtractor, bodyParser });
  });

  it('can handle any input.', async(): Promise<void> => {
    await expect(requestParser.canHandle()).resolves.toBeUndefined();
  });

  it('errors if there is no input.', async(): Promise<void> => {
    await expect(requestParser.handle({ url: 'url' } as any)).rejects.toThrow('Missing method.');
  });

  it('returns the output of all input parsers after calling handle.', async(): Promise<void> => {
    bodyParser.handle = ({ metadata }): any => ({ data: 'body', metadata });
    await expect(requestParser.handle({ url: 'url', method: 'GET' } as any)).resolves.toEqual({
      method: 'GET',
      target: 'target',
      preferences: 'preference',
      body: { data: 'body', metadata: 'metadata' },
    });
  });
});
