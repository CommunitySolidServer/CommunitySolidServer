import { BasicConditionsParser } from '../../../../../src/http/input/conditions/BasicConditionsParser';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';

describe('A BasicConditionsParser', (): void => {
  const dateString = 'Wed, 21 Oct 2015 07:28:00 UTC';
  const date = new Date('2015-10-21T07:28:00.000Z');
  let request: HttpRequest;
  const parser = new BasicConditionsParser();

  beforeEach(async(): Promise<void> => {
    request = { headers: {}, method: 'GET' } as HttpRequest;
  });

  it('returns undefined if there are no relevant headers.', async(): Promise<void> => {
    await expect(parser.handleSafe(request)).resolves.toBeUndefined();
  });

  it('parses the if-modified-since header.', async(): Promise<void> => {
    request.headers['if-modified-since'] = dateString;
    await expect(parser.handleSafe(request)).resolves.toEqual({ modifiedSince: date });
  });

  it('parses the if-unmodified-since header.', async(): Promise<void> => {
    request.headers['if-unmodified-since'] = dateString;
    await expect(parser.handleSafe(request)).resolves.toEqual({ unmodifiedSince: date });
  });

  it('parses the if-match header.', async(): Promise<void> => {
    request.headers['if-match'] = '"1234567", "abcdefg"';
    await expect(parser.handleSafe(request)).resolves.toEqual({ matchesETag: [ '"1234567"', '"abcdefg"' ]});
  });

  it('parses the if-none-match header.', async(): Promise<void> => {
    request.headers['if-none-match'] = '*';
    await expect(parser.handleSafe(request)).resolves.toEqual({ notMatchesETag: [ '*' ]});
  });

  it('does not parse the if-modified-since header if there is an if-none-match header.', async(): Promise<void> => {
    request.headers['if-modified-since'] = dateString;
    request.headers['if-none-match'] = '*';
    await expect(parser.handleSafe(request)).resolves.toEqual({ notMatchesETag: [ '*' ]});
  });

  it('only parses the if-modified-since header for GET and HEAD requests.', async(): Promise<void> => {
    request.headers['if-modified-since'] = dateString;
    request.method = 'PUT';
    await expect(parser.handleSafe(request)).resolves.toBeUndefined();
  });

  it('does not parse the if-unmodified-since header if there is an if-match header.', async(): Promise<void> => {
    request.headers['if-unmodified-since'] = dateString;
    request.headers['if-match'] = '*';
    await expect(parser.handleSafe(request)).resolves.toEqual({ matchesETag: [ '*' ]});
  });

  it('ignores invalid dates.', async(): Promise<void> => {
    request.headers['if-modified-since'] = 'notADate';
    await expect(parser.handleSafe(request)).resolves.toBeUndefined();
  });
});
