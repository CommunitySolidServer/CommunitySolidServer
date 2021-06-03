import 'jest-rdf';
import { DataFactory } from 'n3';
import stringifyStream from 'stream-to-string';
import { TextErrorHandler } from '../../../../src/ldp/http/TextErrorHandler';
import { NotFoundHttpError } from '../../../../src/util/errors/NotFoundHttpError';
import { HTTP, XSD } from '../../../../src/util/Vocabularies';
import literal = DataFactory.literal;

describe('A TextErrorHandler', (): void => {
  // The error object can get modified by the handler
  let error: Error;
  let stack: string | undefined;
  let handler: TextErrorHandler;

  beforeEach(async(): Promise<void> => {
    error = new NotFoundHttpError('not here');
    ({ stack } = error);

    handler = new TextErrorHandler(true);
  });

  it('can handle everything.', async(): Promise<void> => {
    await expect(handler.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('creates a text representation of the error.', async(): Promise<void> => {
    const prom = handler.handle({ error } as any);
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.statusCode).toBe(404);
    expect(result.metadata?.get(HTTP.terms.statusCodeNumber)).toEqualRdfTerm(literal(404, XSD.terms.integer));
    expect(result.metadata?.contentType).toBe('text/plain');
    const text = await stringifyStream(result.data!);
    expect(text).toBe(`${stack}\n`);
  });

  it('concatenates name and message if there is no stack.', async(): Promise<void> => {
    delete error.stack;
    const prom = handler.handle({ error } as any);
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.statusCode).toBe(404);
    expect(result.metadata?.get(HTTP.terms.statusCodeNumber)).toEqualRdfTerm(literal(404, XSD.terms.integer));
    expect(result.metadata?.contentType).toBe('text/plain');
    const text = await stringifyStream(result.data!);
    expect(text).toBe(`NotFoundHttpError: not here\n`);
  });

  it('hides the stack trace if the option is disabled.', async(): Promise<void> => {
    handler = new TextErrorHandler();
    const prom = handler.handle({ error } as any);
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.statusCode).toBe(404);
    expect(result.metadata?.get(HTTP.terms.statusCodeNumber)).toEqualRdfTerm(literal(404, XSD.terms.integer));
    expect(result.metadata?.contentType).toBe('text/plain');
    const text = await stringifyStream(result.data!);
    expect(text).toBe(`NotFoundHttpError: not here\n`);
  });
});
