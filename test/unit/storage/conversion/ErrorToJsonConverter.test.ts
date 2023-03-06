import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { ErrorToJsonConverter } from '../../../../src/storage/conversion/ErrorToJsonConverter';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import type { OAuthErrorFields } from '../../../../src/util/errors/OAuthHttpError';
import { OAuthHttpError } from '../../../../src/util/errors/OAuthHttpError';
import { readJsonStream } from '../../../../src/util/StreamUtil';

describe('An ErrorToJsonConverter', (): void => {
  const identifier = { path: 'http://test.com/error' };
  const converter = new ErrorToJsonConverter();
  const preferences = {};

  it('supports going from errors to json.', async(): Promise<void> => {
    await expect(converter.getOutputTypes('internal/error')).resolves.toEqual({ 'application/json': 1 });
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

  it('adds OAuth fields if present.', async(): Promise<void> => {
    const out: OAuthErrorFields = {
      error: 'error',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      error_description: 'error_description',
      scope: 'scope',
      state: 'state',
    };
    const error = new OAuthHttpError(out, 'InvalidRequest', 400, 'error text');
    const representation = new BasicRepresentation([ error ], 'internal/error', false);
    const prom = converter.handle({ identifier, representation, preferences });
    await expect(prom).resolves.toBeDefined();
    const result = await prom;
    expect(result.binary).toBe(true);
    expect(result.metadata.contentType).toBe('application/json');
    await expect(readJsonStream(result.data)).resolves.toEqual({
      name: 'InvalidRequest',
      message: 'error text',
      statusCode: 400,
      errorCode: 'H400',
      stack: error.stack,
      error: 'error',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      error_description: 'error_description',
      scope: 'scope',
      state: 'state',
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
