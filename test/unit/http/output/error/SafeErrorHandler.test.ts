import 'jest-rdf';
import { DataFactory } from 'n3';
import type { ErrorHandler } from '../../../../../src/http/output/error/ErrorHandler';
import { SafeErrorHandler } from '../../../../../src/http/output/error/SafeErrorHandler';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import { NotFoundHttpError } from '../../../../../src/util/errors/NotFoundHttpError';
import { readableToString } from '../../../../../src/util/StreamUtil';
import { HTTP, XSD } from '../../../../../src/util/Vocabularies';
import literal = DataFactory.literal;

describe('A SafeErrorHandler', (): void => {
  let error: Error;
  let stack: string | undefined;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let handler: SafeErrorHandler;

  beforeEach(async(): Promise<void> => {
    error = new NotFoundHttpError('not here');
    ({ stack } = error);

    errorHandler = {
      handleSafe: jest.fn().mockResolvedValue(new BasicRepresentation('<html>fancy error</html>', 'text/html')),
    } as any;

    handler = new SafeErrorHandler(errorHandler, true);
  });

  it('can handle everything.', async(): Promise<void> => {
    await expect(handler.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('sends the request to the stored error handler.', async(): Promise<void> => {
    const prom = handler.handle({ error } as any);
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.metadata?.contentType).toBe('text/html');
    await expect(readableToString(result.data!)).resolves.toBe('<html>fancy error</html>');
  });

  describe('where the wrapped error handler fails', (): void => {
    beforeEach(async(): Promise<void> => {
      errorHandler.handleSafe.mockRejectedValue(new Error('handler failed'));
    });

    it('creates a text representation of the error.', async(): Promise<void> => {
      const prom = handler.handle({ error } as any);
      await expect(prom).resolves.toBeDefined();
      const result = await prom;
      expect(result.statusCode).toBe(404);
      expect(result.metadata?.get(HTTP.terms.statusCodeNumber)).toEqualRdfTerm(literal(404, XSD.terms.integer));
      expect(result.metadata?.contentType).toBe('text/plain');
      await expect(readableToString(result.data!)).resolves.toBe(`${stack}\n`);
    });

    it('concatenates name and message if there is no stack.', async(): Promise<void> => {
      delete error.stack;
      const prom = handler.handle({ error } as any);
      await expect(prom).resolves.toBeDefined();
      const result = await prom;
      expect(result.statusCode).toBe(404);
      expect(result.metadata?.get(HTTP.terms.statusCodeNumber)).toEqualRdfTerm(literal(404, XSD.terms.integer));
      expect(result.metadata?.contentType).toBe('text/plain');
      await expect(readableToString(result.data!)).resolves.toBe(`NotFoundHttpError: not here\n`);
    });

    it('hides the stack trace if the option is disabled.', async(): Promise<void> => {
      handler = new SafeErrorHandler(errorHandler);
      const prom = handler.handle({ error } as any);
      await expect(prom).resolves.toBeDefined();
      const result = await prom;
      expect(result.statusCode).toBe(404);
      expect(result.metadata?.get(HTTP.terms.statusCodeNumber)).toEqualRdfTerm(literal(404, XSD.terms.integer));
      expect(result.metadata?.contentType).toBe('text/plain');
      await expect(readableToString(result.data!)).resolves.toBe(`NotFoundHttpError: not here\n`);
    });
  });
});
