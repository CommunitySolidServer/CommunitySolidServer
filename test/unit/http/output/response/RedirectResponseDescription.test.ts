import { RedirectResponseDescription } from '../../../../../src/http/output/response/RedirectResponseDescription';
import { FoundHttpError } from '../../../../../src/util/errors/FoundHttpError';
import { SOLID_HTTP } from '../../../../../src/util/Vocabularies';

describe('A RedirectResponseDescription', (): void => {
  const error = new FoundHttpError('http://test.com/foo');

  it('has status the code and location of the error.', async(): Promise<void> => {
    const description = new RedirectResponseDescription(error);
    expect(description.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(error.location);
    expect(description.metadata).toBe(error.metadata);
    expect(description.statusCode).toBe(error.statusCode);
  });
});
