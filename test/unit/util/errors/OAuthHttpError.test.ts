import { OAuthHttpError } from '../../../../src/util/errors/OAuthHttpError';

describe('An OAuthHttpError', (): void => {
  it('contains relevant information.', async(): Promise<void> => {
    const error = new OAuthHttpError({ error: 'error!' }, 'InvalidRequest', 400, 'message!');
    expect(error.mandatoryFields.error).toBe('error!');
    expect(error.name).toBe('InvalidRequest');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('message!');
  });

  it('has optional fields.', async(): Promise<void> => {
    const error = new OAuthHttpError({ error: 'error!' });
    expect(error.mandatoryFields.error).toBe('error!');
    expect(error.name).toBe('OAuthHttpError');
    expect(error.statusCode).toBe(500);
  });

  it('can identify OAuth errors.', async(): Promise<void> => {
    const error = new OAuthHttpError({ error: 'error!' });
    expect(OAuthHttpError.isInstance('apple')).toBe(false);
    expect(OAuthHttpError.isInstance(error)).toBe(true);
  });
});
