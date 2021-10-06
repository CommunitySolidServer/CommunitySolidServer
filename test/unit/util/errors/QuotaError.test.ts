import { QuotaError } from '../../../../src/util/errors/QuotaError';

describe('QuotaError', (): void => {
  it('has status code 400.', async(): Promise<void> => {
    const error = new QuotaError('test');

    expect(error.statusCode).toEqual(413);
    expect(error.message).toEqual('test');
    expect(error.name).toEqual('QuotaError');
  });

  it('has a default message if none was provided.', async(): Promise<void> => {
    const error = new QuotaError();

    expect(error.message).toEqual('Storage quota was exceeded.');
  });
});
