import { BasicRequestParser } from '../../../../src/http/input/BasicRequestParser';
import type { BodyParser } from '../../../../src/http/input/body/BodyParser';
import type { ConditionsParser } from '../../../../src/http/input/conditions/ConditionsParser';
import type { TargetExtractor } from '../../../../src/http/input/identifier/TargetExtractor';
import type { MetadataParser } from '../../../../src/http/input/metadata/MetadataParser';
import type { PreferenceParser } from '../../../../src/http/input/preferences/PreferenceParser';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BasicRequestParser', (): void => {
  let targetExtractor: TargetExtractor;
  let preferenceParser: PreferenceParser;
  let metadataParser: MetadataParser;
  let conditionsParser: ConditionsParser;
  let bodyParser: BodyParser;
  let requestParser: BasicRequestParser;

  beforeEach(async(): Promise<void> => {
    targetExtractor = new StaticAsyncHandler(true, { path: 'target' });
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
      target: { path: 'target' },
      preferences: 'preference',
      conditions: 'conditions',
      body: { data: 'body', metadata: new RepresentationMetadata({ path: 'target' }) },
    });
  });
});
