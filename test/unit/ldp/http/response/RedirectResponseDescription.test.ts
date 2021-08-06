import { RedirectResponseDescription } from '../../../../../src/ldp/http/response/RedirectResponseDescription';
import { SOLID_HTTP } from '../../../../../src/util/Vocabularies';

describe('A RedirectResponseDescription', (): void => {
  const location = 'http://test.com/foo';

  it('has status code 302 and a location.', async(): Promise<void> => {
    const description = new RedirectResponseDescription(location);
    expect(description.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(location);
    expect(description.statusCode).toBe(302);
  });

  it('has status code 301 if the change is permanent.', async(): Promise<void> => {
    const description = new RedirectResponseDescription(location, true);
    expect(description.metadata?.get(SOLID_HTTP.terms.location)?.value).toBe(location);
    expect(description.statusCode).toBe(301);
  });
});
