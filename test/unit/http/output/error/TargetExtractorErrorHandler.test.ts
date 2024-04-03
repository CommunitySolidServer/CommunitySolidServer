import type { TargetExtractor } from '../../../../../src/http/input/identifier/TargetExtractor';
import type { ErrorHandler, ErrorHandlerArgs } from '../../../../../src/http/output/error/ErrorHandler';
import { TargetExtractorErrorHandler } from '../../../../../src/http/output/error/TargetExtractorErrorHandler';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { SOLID_ERROR } from '../../../../../src/util/Vocabularies';

describe('A TargetExtractorErrorHandler', (): void => {
  const identifier: ResourceIdentifier = { path: 'http://example.com/foo' };
  let input: ErrorHandlerArgs;
  let source: jest.Mocked<ErrorHandler>;
  let targetExtractor: jest.Mocked<TargetExtractor>;
  let handler: TargetExtractorErrorHandler;

  beforeEach(async(): Promise<void> => {
    input = {
      request: 'request' as any,
      error: new NotFoundHttpError(),
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue('response'),
    } satisfies Partial<ErrorHandler> as any;

    targetExtractor = {
      handleSafe: jest.fn().mockResolvedValue(identifier),
    } satisfies Partial<TargetExtractor> as any;

    handler = new TargetExtractorErrorHandler(source, targetExtractor);
  });

  it('can handle input its source can handle.', async(): Promise<void> => {
    await expect(handler.canHandle(input)).resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenLastCalledWith(input);

    const error = new Error('bad data');
    source.canHandle.mockRejectedValueOnce(error);
    await expect(handler.canHandle(input)).rejects.toThrow(error);
  });

  it('adds the identifier as metadata.', async(): Promise<void> => {
    await expect(handler.handle(input)).resolves.toBe('response');
    expect(input.error.metadata.get(SOLID_ERROR.terms.target)?.value).toEqual(identifier.path);
    expect(targetExtractor.handleSafe).toHaveBeenLastCalledWith(input);
  });
});
