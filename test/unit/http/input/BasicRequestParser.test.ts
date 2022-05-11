import { BasicRequestParser } from '../../../../src/http/input/BasicRequestParser';
import type { BodyParser } from '../../../../src/http/input/body/BodyParser';
import type { ConditionsParser } from '../../../../src/http/input/conditions/ConditionsParser';
import type { TargetExtractor } from '../../../../src/http/input/identifier/TargetExtractor';
import type { MetadataParser } from '../../../../src/http/input/metadata/MetadataParser';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { RepresentationPreferences } from '../../../../src/http/representation/RepresentationPreferences';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BasicRequestParser', (): void => {
  const request: HttpRequest = {} as any;
  const preferences: RepresentationPreferences = { type: {}};
  let targetExtractor: TargetExtractor;
  let metadataParser: MetadataParser;
  let conditionsParser: ConditionsParser;
  let bodyParser: BodyParser;
  let requestParser: BasicRequestParser;

  beforeEach(async(): Promise<void> => {
    targetExtractor = new StaticAsyncHandler(true, { path: 'target' });
    metadataParser = new StaticAsyncHandler(true, undefined);
    conditionsParser = new StaticAsyncHandler(true, 'conditions' as any);
    bodyParser = new StaticAsyncHandler(true, 'body' as any);
    requestParser = new BasicRequestParser(
      { targetExtractor, metadataParser, conditionsParser, bodyParser },
    );
  });

  it('can handle any input.', async(): Promise<void> => {
    await expect(requestParser.canHandle({ request, preferences })).resolves.toBeUndefined();
  });

  it('errors if there is no input.', async(): Promise<void> => {
    await expect(requestParser.handle({ request, preferences }))
      .rejects.toThrow('No method specified on the HTTP request');
  });

  it('returns the output of all input parsers after calling handle.', async(): Promise<void> => {
    request.method = 'GET';
    bodyParser.handle = ({ metadata }): any => ({ data: 'body', metadata });
    await expect(requestParser.handle({ request, preferences })).resolves.toEqual({
      method: 'GET',
      target: { path: 'target' },
      preferences,
      conditions: 'conditions',
      body: { data: 'body', metadata: new RepresentationMetadata({ path: 'target' }) },
    });
  });
});
