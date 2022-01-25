import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';

describe('An BadRequestHttpError', (): void => {
  it('has status code 400.', async(): Promise<void> => {
    const error = new BadRequestHttpError('test');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('test');
    expect(error.name).toBe('BadRequestHttpError');
  });

  it('has a default message if none was provided.', async(): Promise<void> => {
    const error = new BadRequestHttpError();

    expect(error.message).toBe('The given input is not supported by the server configuration.');
  });
});
