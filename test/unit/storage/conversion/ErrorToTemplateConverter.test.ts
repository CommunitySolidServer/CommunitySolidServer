import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { TemplateEngine } from '../../../../src/pods/generate/TemplateEngine';
import { ErrorToTemplateConverter } from '../../../../src/storage/conversion/ErrorToTemplateConverter';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { readableToString } from '../../../../src/util/StreamUtil';
import { mockFs } from '../../../util/Util';

jest.mock('fs');

describe('An ErrorToTemplateConverter', (): void => {
  let cache: { data: any };
  const identifier = { path: 'http://test.com/error' };
  const templatePath = '/templates/error.template';
  const descriptions = '/templates/codes';
  const errorCode = 'E0001';
  let engine: TemplateEngine;
  let converter: ErrorToTemplateConverter;
  const preferences = {};

  beforeEach(async(): Promise<void> => {
    cache = mockFs('/templates');
    cache.data['error.template'] = '{{ template }}';
    cache.data.codes = { [`${errorCode}.html`]: '{{{ errorText }}}' };
    engine = {
      apply: jest.fn().mockReturnValue('<html>'),
    };

    converter = new ErrorToTemplateConverter(engine, templatePath, descriptions, 'text/html', '.html');
  });

  it('supports going from errors to the given content type.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual({ 'internal/error': 1 });
    await expect(converter.getOutputTypes()).resolves.toEqual({ 'text/html': 1 });
  });

  it('does not support multiple errors.', async(): Promise<void> => {
    const representation = new BasicRepresentation([ new Error('a'), new Error('b') ], 'internal/error', false);
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
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}', { name: 'BadRequestHttpError', message: 'error text' },
    );
  });

  it('adds additional information if an error code is found.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text', { errorCode, details: { key: 'val' }});
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(engine.apply).toHaveBeenCalledTimes(2);
    expect(engine.apply).toHaveBeenCalledWith(
      '{{{ errorText }}}', { key: 'val' },
    );
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}',
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack, description: '<html>' },
    );
  });

  it('sends an empty object for additional error code parameters if none are defined.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text', { errorCode });
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(engine.apply).toHaveBeenCalledTimes(2);
    expect(engine.apply).toHaveBeenCalledWith(
      '{{{ errorText }}}', { },
    );
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}',
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack, description: '<html>' },
    );
  });

  it('converts errors with a code as usual if no corresponding template is found.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text', { errorCode: 'invalid' });
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenLastCalledWith(
      '{{ template }}',
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack },
    );
  });
});
