import { BasicConditionsParser } from '../../../../../src/http/input/conditions/BasicConditionsParser';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';
import type { ETagHandler } from '../../../../../src/storage/conditions/ETagHandler';

describe('A BasicConditionsParser', (): void => {
  const dateString = 'Wed, 21 Oct 2015 07:28:00 UTC';
  const date = new Date('2015-10-21T07:28:00.000Z');
  let request: HttpRequest;
  let eTagHandler: ETagHandler;
  let parser: BasicConditionsParser;

  beforeEach(async(): Promise<void> => {
    request = { headers: {}, method: 'GET' } as HttpRequest;

    eTagHandler = {
      getETag: jest.fn(),
      matchesETag: jest.fn(),
      sameResourceState: jest.fn(),
    };

    parser = new BasicConditionsParser(eTagHandler);
  });

  it('returns undefined if there are no relevant headers.', async(): Promise<void> => {
    await expect(parser.handleSafe(request)).resolves.toBeUndefined();
  });

  it('parses the if-modified-since header.', async(): Promise<void> => {
    request.headers['if-modified-since'] = dateString;
    await expect(parser.handleSafe(request)).resolves.toEqual({ eTagHandler, modifiedSince: date });
  });

  it('parses the if-unmodified-since header.', async(): Promise<void> => {
    request.headers['if-unmodified-since'] = dateString;
    await expect(parser.handleSafe(request)).resolves.toEqual({ eTagHandler, unmodifiedSince: date });
  });

  it('parses the if-match header.', async(): Promise<void> => {
    request.headers['if-match'] = '"1234567", "abcdefg"';
    await expect(parser.handleSafe(request)).resolves
      .toEqual({ eTagHandler, matchesETag: [ '"1234567"', '"abcdefg"' ]});
  });

  it('parses the if-none-match header.', async(): Promise<void> => {
    request.headers['if-none-match'] = '*';
    await expect(parser.handleSafe(request)).resolves.toEqual({ eTagHandler, notMatchesETag: [ '*' ]});
  });

  it('does not parse the if-modified-since header if there is an if-none-match header.', async(): Promise<void> => {
    request.headers['if-modified-since'] = dateString;
    request.headers['if-none-match'] = '*';
    await expect(parser.handleSafe(request)).resolves.toEqual({ eTagHandler, notMatchesETag: [ '*' ]});
  });

  it('only parses the if-modified-since header for GET and HEAD requests.', async(): Promise<void> => {
    request.headers['if-modified-since'] = dateString;
    request.method = 'PUT';
    await expect(parser.handleSafe(request)).resolves.toBeUndefined();
  });

  it('does not parse the if-unmodified-since header if there is an if-match header.', async(): Promise<void> => {
    request.headers['if-unmodified-since'] = dateString;
    request.headers['if-match'] = '*';
    await expect(parser.handleSafe(request)).resolves.toEqual({ eTagHandler, matchesETag: [ '*' ]});
  });

  it('ignores invalid dates.', async(): Promise<void> => {
    request.headers['if-modified-since'] = 'notADate';
    await expect(parser.handleSafe(request)).resolves.toBeUndefined();
  });
});
