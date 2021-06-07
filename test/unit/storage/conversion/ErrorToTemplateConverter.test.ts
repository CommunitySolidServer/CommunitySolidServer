import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { TemplateEngine } from '../../../../src/pods/generate/TemplateEngine';
import { ErrorToTemplateConverter } from '../../../../src/storage/conversion/ErrorToTemplateConverter';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { readableToString } from '../../../../src/util/StreamUtil';

const mockRead = jest.fn().mockResolvedValue('{{ template }}');
jest.mock('fs', (): any => ({
  promises: { readFile: (...args: any[]): any => mockRead(...args) },
}));

describe('An ErrorToTemplateConverter', (): void => {
  const identifier = { path: 'http://test.com/error' };
  let engine: TemplateEngine;
  const path = '/template/error.template';
  let converter: ErrorToTemplateConverter;
  const preferences = {};

  beforeEach(async(): Promise<void> => {
    mockRead.mockClear();
    engine = {
      apply: jest.fn().mockReturnValue('<html>'),
    };

    converter = new ErrorToTemplateConverter(engine, path, 'text/html');
  });

  it('supports going from errors to quads.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual({ 'internal/error': 1 });
    await expect(converter.getOutputTypes()).resolves.toEqual({ 'text/html': 1 });
  });

  it('does not support multiple errors.', async(): Promise<void> => {
    const representation = new BasicRepresentation([ new Error(), new Error() ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).rejects.toThrow('Only single errors are supported.');
    await expect(prom).rejects.toThrow(InternalServerError);
  });

  it('calls the template engine with all error fields.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text');
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockRead).toHaveBeenLastCalledWith(path, 'utf8');
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}', { name: 'BadRequestHttpError', message: 'error text', stack: error.stack },
    );
  });

  it('only adds stack if it is defined.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text');
    delete error.stack;
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockRead).toHaveBeenLastCalledWith(path, 'utf8');
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}', { name: 'BadRequestHttpError', message: 'error text' },
    );
  });
});
