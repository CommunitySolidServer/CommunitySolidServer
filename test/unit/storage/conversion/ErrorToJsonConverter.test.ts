import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { ErrorToJsonConverter } from '../../../../src/storage/conversion/ErrorToJsonConverter';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { readJsonStream } from '../../../../src/util/StreamUtil';

describe('An ErrorToJsonConverter', (): void => {
  const identifier = { path: 'http://test.com/error' };
  const converter = new ErrorToJsonConverter();
  const preferences = {};

  it('supports going from errors to json.', async(): Promise<void> => {
    await expect(converter.getInputTypes()).resolves.toEqual({ 'internal/error': 1 });
    await expect(converter.getOutputTypes()).resolves.toEqual({ 'application/json': 1 });
  });

  it('adds all HttpError fields.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text');
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('application/json');
    await expect(readJsonStream(result.data)).resolves.toEqual({
      name: 'BadRequestHttpError',
      message: 'error text',
      statusCode: 400,
      errorCode: 'H400',
      stack: error.stack,
    });
  });

  it('copies the HttpError details.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text', { details: { important: 'detail' }});
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('application/json');
    await expect(readJsonStream(result.data)).resolves.toEqual({
      name: 'BadRequestHttpError',
      message: 'error text',
      statusCode: 400,
      errorCode: 'H400',
      details: { important: 'detail' },
      stack: error.stack,
    });
  });

  it('does not copy the details if they are not serializable.', async(): Promise<void> => {
    const error = new BadRequestHttpError('error text', { details: { object: BigInt(1) }});
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('application/json');
    await expect(readJsonStream(result.data)).resolves.toEqual({
      name: 'BadRequestHttpError',
      message: 'error text',
      statusCode: 400,
      errorCode: 'H400',
      stack: error.stack,
    });
  });

  it('defaults to status code 500 for non-HTTP errors.', async(): Promise<void> => {
    const error = new Error('error text');
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('application/json');
    await expect(readJsonStream(result.data)).resolves.toEqual({
      name: 'Error',
      message: 'error text',
      statusCode: 500,
      stack: error.stack,
    });
  });

  it('only adds stack if it is defined.', async(): Promise<void> => {
    const error = new Error('error text');
    delete error.stack;
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('application/json');
    await expect(readJsonStream(result.data)).resolves.toEqual({
      name: 'Error',
      message: 'error text',
      statusCode: 500,
    });
  });
});
