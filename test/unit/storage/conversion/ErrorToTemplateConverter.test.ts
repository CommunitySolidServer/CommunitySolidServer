import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { ErrorToTemplateConverter } from '../../../../src/storage/conversion/ErrorToTemplateConverter';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { resolveModulePath } from '../../../../src/util/PathUtil';
import { readableToString } from '../../../../src/util/StreamUtil';
import type { TemplateEngine } from '../../../../src/util/templates/TemplateEngine';

describe('An ErrorToTemplateConverter', (): void => {
  const identifier = { path: 'http://test.com/error' };
  const mainTemplatePath = '/templates/main.html';
  const codeTemplatesPath = '/templates/codes';
  const extension = '.html';
  const contentType = 'text/html';
  const errorCode = 'E0001';
  let templateEngine: jest.Mocked<TemplateEngine>;
  let converter: ErrorToTemplateConverter;
  const preferences = {};

  beforeEach(async(): Promise<void> => {
    templateEngine = {
      render: jest.fn().mockReturnValue(Promise.resolve('<html>')),
    };
    converter = new ErrorToTemplateConverter(templateEngine,
      { mainTemplatePath, codeTemplatesPath, extension, contentType });
  });

  it('supports going from errors to the given content type.', async(): Promise<void> => {
    await expect(converter.getOutputTypes('internal/error')).resolves.toEqual({ 'text/html': 1 });
  });

  it('works with non-HTTP errors.', async(): Promise<void> => {
    const error = new Error('error text');
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();

    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.render).toHaveBeenCalledTimes(1);
    expect(templateEngine.render).toHaveBeenLastCalledWith(
      { name: 'Error', message: 'error text', stack: error.stack },
      { templateFile: mainTemplatePath },
    );
  });

  it('calls the template engine with all HTTP error fields.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text');
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    templateEngine.render.mockRejectedValueOnce(new Error('error-specific template not found'));
    await expect(prom).resolves.toBeDefined();

    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.render).toHaveBeenCalledTimes(2);
    expect(templateEngine.render).toHaveBeenNthCalledWith(1,
      {},
      { templatePath: '/templates/codes', templateFile: 'H400.html' });
    expect(templateEngine.render).toHaveBeenNthCalledWith(2,
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack },
      { templateFile: mainTemplatePath });
  });

  it('only adds stack if it is defined.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text');
    delete error.stack;
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    templateEngine.render.mockRejectedValueOnce(new Error('error-specific template not found'));
    await expect(prom).resolves.toBeDefined();

    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.render).toHaveBeenCalledTimes(2);
    expect(templateEngine.render).toHaveBeenNthCalledWith(1,
      {},
      { templatePath: '/templates/codes', templateFile: 'H400.html' });
    expect(templateEngine.render).toHaveBeenNthCalledWith(2,
      { name: 'BadRequestHttpError', message: 'error text' },
      { templateFile: mainTemplatePath });
  });

  it('adds additional information if an error code description is found.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text', { errorCode, details: { key: 'val' }});
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.render).toHaveBeenCalledTimes(2);
    expect(templateEngine.render).toHaveBeenNthCalledWith(1,
      { key: 'val' },
      { templatePath: '/templates/codes', templateFile: 'E0001.html' });
    expect(templateEngine.render).toHaveBeenNthCalledWith(2,
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack, description: '<html>' },
      { templateFile: mainTemplatePath });
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
    expect(templateEngine.render).toHaveBeenCalledTimes(2);
    expect(templateEngine.render).toHaveBeenNthCalledWith(1,
      {},
      { templatePath: '/templates/codes', templateFile: 'E0001.html' });
    expect(templateEngine.render).toHaveBeenNthCalledWith(2,
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack, description: '<html>' },
      { templateFile: mainTemplatePath });
  });

  it('converts errors with a code as usual if no corresponding template is found.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text', { errorCode: 'invalid' });
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    templateEngine.render.mockRejectedValueOnce(new Error('error-specific template not found'));
    await expect(prom).resolves.toBeDefined();

    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/html');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.render).toHaveBeenCalledTimes(2);
    expect(templateEngine.render).toHaveBeenNthCalledWith(1,
      {},
      { templatePath: '/templates/codes', templateFile: 'invalid.html' });
    expect(templateEngine.render).toHaveBeenNthCalledWith(2,
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack },
      { templateFile: mainTemplatePath });
  });

  it('has default template options.', async(): Promise<void> => {
    converter = new ErrorToTemplateConverter(templateEngine);
    const error = new BadRequestHttpError('error text', { errorCode, details: { key: 'val' }});
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('text/markdown');
    await expect(readableToString(result.data)).resolves.toBe('<html>');
    expect(templateEngine.render).toHaveBeenCalledTimes(2);
    expect(templateEngine.render).toHaveBeenNthCalledWith(1,
      { key: 'val' },
      { templatePath: resolveModulePath('templates/error/descriptions/'), templateFile: 'E0001.md.hbs' });
    expect(templateEngine.render).toHaveBeenNthCalledWith(2,
      { name: 'BadRequestHttpError', message: 'error text', stack: error.stack, description: '<html>' },
      { templateFile: resolveModulePath('templates/error/main.md.hbs') });
  });
});
