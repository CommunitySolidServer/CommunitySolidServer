import { BasicRequestParser } from '../../../../src/ldp/http/BasicRequestParser';
import type { BodyParser } from '../../../../src/ldp/http/BodyParser';
import type { ConditionsParser } from '../../../../src/ldp/http/conditions/ConditionsParser';
import type { MetadataParser } from '../../../../src/ldp/http/metadata/MetadataParser';
import type { PreferenceParser } from '../../../../src/ldp/http/PreferenceParser';
import type { TargetExtractor } from '../../../../src/ldp/http/TargetExtractor';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BasicRequestParser', (): void => {
  let targetExtractor: TargetExtractor;
  let preferenceParser: PreferenceParser;
  let metadataParser: MetadataParser;
  let conditionsParser: ConditionsParser;
  let bodyParser: BodyParser;
  let requestParser: BasicRequestParser;

  beforeEach(async(): Promise<void> => {
    targetExtractor = new StaticAsyncHandler(true, 'target' as any);
    preferenceParser = new StaticAsyncHandler(true, 'preference' as any);
    metadataParser = new StaticAsyncHandler(true, undefined);
    conditionsParser = new StaticAsyncHandler(true, 'conditions' as any);
    bodyParser = new StaticAsyncHandler(true, 'body' as any);
    requestParser = new BasicRequestParser(
      { targetExtractor, preferenceParser, metadataParser, conditionsParser, bodyParser },
    );
  });

  it('can handle any input.', async(): Promise<void> => {
    await expect(requestParser.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('errors if there is no input.', async(): Promise<void> => {
    await expect(requestParser.handle({ url: 'url' } as any))
      .rejects.toThrow('No method specified on the HTTP request');
  });

  it('returns the output of all input parsers after calling handle.', async(): Promise<void> => {
    bodyParser.handle = ({ metadata }): any => ({ data: 'body', metadata });
    await expect(requestParser.handle({ url: 'url', method: 'GET' } as any)).resolves.toEqual({
      method: 'GET',
      target: 'target',
      preferences: 'preference',
      conditions: 'conditions',
      body: { data: 'body', metadata: new RepresentationMetadata('target') },
    });
  });
});
