import 'jest-rdf';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { PreferenceParser } from '../../../../../src/http/input/preferences/PreferenceParser';
import { ConvertingErrorHandler } from '../../../../../src/http/output/error/ConvertingErrorHandler';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../../src/http/representation/Representation';
import type { RepresentationPreferences } from '../../../../../src/http/representation/RepresentationPreferences';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../../../src/storage/conversion/RepresentationConverter';
import type { HttpError } from '../../../../../src/util/errors/HttpError';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { HTTP, XSD } from '../../../../../src/util/Vocabularies';
import literal = DataFactory.literal;

const preferences: RepresentationPreferences = { type: { 'text/turtle': 1 }};

async function expectValidArgs(args: RepresentationConverterArgs, stack?: string, cause?: Error): Promise<void> {
  expect(args.preferences).toBe(preferences);
  expect(args.representation.metadata.get(HTTP.terms.statusCodeNumber))
    .toEqualRdfTerm(literal(404, XSD.terms.integer));
  expect(args.representation.metadata.contentType).toBe('internal/error');

  // Error contents
  const errorArray = await arrayifyStream(args.representation.data);
  expect(errorArray).toHaveLength(1);
  const resultError = errorArray[0];
  expect(resultError).toMatchObject({ name: 'NotFoundHttpError', message: 'not here' });
  expect(resultError.stack).toBe(stack);
  expect(resultError.cause).toBe(cause);
}

describe('A ConvertingErrorHandler', (): void => {
  // The error object can get modified by the handler
  let error: HttpError;
  const cause = new Error('cause');
  let stack: string | undefined;
  const request = {} as HttpRequest;
  let converter: jest.Mocked<RepresentationConverter>;
  let preferenceParser: jest.Mocked<PreferenceParser>;
  let handler: ConvertingErrorHandler;

  beforeEach(async(): Promise<void> => {
    error = new NotFoundHttpError('not here', { cause });
    ({ stack } = error);
    converter = {
      canHandle: jest.fn(),
      handle: jest.fn(async(): Promise<Representation> =>
        new BasicRepresentation('serialization', 'text/turtle', true)),
      handleSafe: jest.fn(async(): Promise<Representation> =>
        new BasicRepresentation('serialization', 'text/turtle', true)),
    } satisfies Partial<RepresentationConverter> as any;

    preferenceParser = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(preferences),
    } as any;

    handler = new ConvertingErrorHandler(converter, preferenceParser, true);
  });

  it('rejects input not supported by the converter.', async(): Promise<void> => {
    converter.canHandle.mockRejectedValueOnce(new Error('rejected'));
    await expect(handler.canHandle({ error, request })).rejects.toThrow('rejected');
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    const args = converter.canHandle.mock.calls[0][0];
    expect(args.preferences).toBe(preferences);
    expect(args.representation.metadata.contentType).toBe('internal/error');
  });

  it('rejects input not supported by the preference parser.', async(): Promise<void> => {
    preferenceParser.canHandle.mockRejectedValueOnce(new Error('rejected'));
    await expect(handler.canHandle({ error, request })).rejects.toThrow('rejected');
    expect(preferenceParser.canHandle).toHaveBeenCalledTimes(1);
    expect(preferenceParser.canHandle).toHaveBeenLastCalledWith({ request });
    expect(converter.canHandle).toHaveBeenCalledTimes(0);
  });

  it('accepts input supported by the converter.', async(): Promise<void> => {
    await expect(handler.canHandle({ error, request })).resolves.toBeUndefined();
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    const args = converter.canHandle.mock.calls[0][0];
    expect(args.preferences).toBe(preferences);
    expect(args.representation.metadata.contentType).toBe('internal/error');
  });

  it('returns the converted error response.', async(): Promise<void> => {
    const prom = handler.handle({ error, request });
    await expect(prom).resolves.toMatchObject({ statusCode: 404 });
    expect((await prom).metadata?.contentType).toBe('text/turtle');
    expect(converter.handle).toHaveBeenCalledTimes(1);
    const args = converter.handle.mock.calls[0][0];
    await expectValidArgs(args, stack, cause);
  });

  it('uses the handleSafe function of the converter during its own handleSafe call.', async(): Promise<void> => {
    const prom = handler.handleSafe({ error, request });
    await expect(prom).resolves.toMatchObject({ statusCode: 404 });
    expect((await prom).metadata?.contentType).toBe('text/turtle');
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    const args = converter.handleSafe.mock.calls[0][0];
    await expectValidArgs(args, stack, cause);
  });

  it('hides the stack trace and cause if the option is disabled.', async(): Promise<void> => {
    handler = new ConvertingErrorHandler(converter, preferenceParser);
    const prom = handler.handle({ error, request });
    await expect(prom).resolves.toMatchObject({ statusCode: 404 });
    expect((await prom).metadata?.contentType).toBe('text/turtle');
    expect(converter.handle).toHaveBeenCalledTimes(1);
    const args = converter.handle.mock.calls[0][0];
    await expectValidArgs(args);
  });
});
