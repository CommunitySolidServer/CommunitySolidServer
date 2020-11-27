import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('An BadRequestHttpError', (): void => {
  it('has status code 400.', async(): Promise<void> => {
    const error = new BadRequestHttpError('test');

    expect(error.statusCode).toEqual(400);
    expect(error.message).toEqual('test');
    expect(error.name).toEqual('BadRequestHttpError');
  });

  it('has a default message if none was provided.', async(): Promise<void> => {
    const error = new BadRequestHttpError();

    expect(error.message).toEqual('The given input is not supported by the server configuration.');
  });
});
