import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('An UnsupportedHttpError', (): void => {
  it('has status code 400.', async (): Promise<void> => {
    const error = new UnsupportedHttpError('test');

    expect(error.statusCode).toEqual(400);
    expect(error.message).toEqual('test');
    expect(error.name).toEqual('UnsupportedHttpError');
  });

  it('has a default message if none was provided.', async (): Promise<void> => {
    const error = new UnsupportedHttpError();

    expect(error.message).toEqual('The given input is not supported by the server configuration.');
  });
});
