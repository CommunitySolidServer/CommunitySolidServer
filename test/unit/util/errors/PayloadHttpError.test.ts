import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { PayloadHttpError } from '../../../../src/util/errors/PayloadHttpError';

describe('PayloadHttpError', (): void => {
  it('has status code 400.', async(): Promise<void> => {
    const error = new PayloadHttpError('test');

    expect(error.statusCode).toEqual(413);
    expect(error.message).toEqual('test');
    expect(error.name).toEqual('PayloadHttpError');
  });

  it('has a default message if none was provided.', async(): Promise<void> => {
    const error = new PayloadHttpError();

    expect(error.message).toEqual('Storage quota was exceeded.');
  });

  describe('isInstance()', (): void => {
    it('should return true when a PayloadHttpError is passed.', async(): Promise<void> => {
      expect(PayloadHttpError.isInstance(new PayloadHttpError())).toBe(true);
    });
    it('should return false when no PayloadHttpError is passed.', async(): Promise<void> => {
      expect(PayloadHttpError.isInstance(new BadRequestHttpError())).toBe(false);
    });
  });
});
