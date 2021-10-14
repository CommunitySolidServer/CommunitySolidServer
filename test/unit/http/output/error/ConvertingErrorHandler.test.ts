import 'jest-rdf';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import { ConvertingErrorHandler } from '../../../../../src/http/output/error/ConvertingErrorHandler';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../../src/http/representation/Representation';
import type { RepresentationPreferences } from '../../../../../src/http/representation/RepresentationPreferences';
import type {
  RepresentationConverter,
  RepresentationConverterArgs,
} from '../../../../../src/storage/conversion/RepresentationConverter';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { HTTP, XSD } from '../../../../../src/util/Vocabularies';
import literal = DataFactory.literal;

const preferences: RepresentationPreferences = { type: { 'text/turtle': 1 }};

async function expectValidArgs(args: RepresentationConverterArgs, stack?: string): Promise<void> {
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
}

describe('A ConvertingErrorHandler', (): void => {
  // The error object can get modified by the handler
  let error: Error;
  let stack: string | undefined;
  let converter: RepresentationConverter;
  let handler: ConvertingErrorHandler;

  beforeEach(async(): Promise<void> => {
    error = new NotFoundHttpError('not here');
    ({ stack } = error);
    converter = {
      canHandle: jest.fn(),
      handle: jest.fn((): Representation => new BasicRepresentation('serialization', 'text/turtle', true)),
      handleSafe: jest.fn((): Representation => new BasicRepresentation('serialization', 'text/turtle', true)),
    } as any;

    handler = new ConvertingErrorHandler(converter, true);
  });

  it('rejects input not supported by the converter.', async(): Promise<void> => {
    (converter.canHandle as jest.Mock).mockRejectedValueOnce(new Error('rejected'));
    await expect(handler.canHandle({ error, preferences })).rejects.toThrow('rejected');
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    const args = (converter.canHandle as jest.Mock).mock.calls[0][0] as RepresentationConverterArgs;
    expect(args.preferences).toBe(preferences);
    expect(args.representation.metadata.contentType).toBe('internal/error');
  });

  it('accepts input supported by the converter.', async(): Promise<void> => {
    await expect(handler.canHandle({ error, preferences })).resolves.toBeUndefined();
    expect(converter.canHandle).toHaveBeenCalledTimes(1);
    const args = (converter.canHandle as jest.Mock).mock.calls[0][0] as RepresentationConverterArgs;
    expect(args.preferences).toBe(preferences);
    expect(args.representation.metadata.contentType).toBe('internal/error');
  });

  it('returns the converted error response.', async(): Promise<void> => {
    const prom = handler.handle({ error, preferences });
    await expect(prom).resolves.toMatchObject({ statusCode: 404 });
    expect((await prom).metadata?.contentType).toBe('text/turtle');
    expect(converter.handle).toHaveBeenCalledTimes(1);
    const args = (converter.handle as jest.Mock).mock.calls[0][0] as RepresentationConverterArgs;
    await expectValidArgs(args, stack);
  });

  it('uses the handleSafe function of the converter during its own handleSafe call.', async(): Promise<void> => {
    const prom = handler.handleSafe({ error, preferences });
    await expect(prom).resolves.toMatchObject({ statusCode: 404 });
    expect((await prom).metadata?.contentType).toBe('text/turtle');
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    const args = (converter.handleSafe as jest.Mock).mock.calls[0][0] as RepresentationConverterArgs;
    await expectValidArgs(args, stack);
  });

  it('hides the stack trace if the option is disabled.', async(): Promise<void> => {
    handler = new ConvertingErrorHandler(converter);
    const prom = handler.handle({ error, preferences });
    await expect(prom).resolves.toMatchObject({ statusCode: 404 });
    expect((await prom).metadata?.contentType).toBe('text/turtle');
    expect(converter.handle).toHaveBeenCalledTimes(1);
    const args = (converter.handle as jest.Mock).mock.calls[0][0] as RepresentationConverterArgs;
    await expectValidArgs(args);
  });
});
