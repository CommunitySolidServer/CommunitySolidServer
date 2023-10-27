import { AcceptPreferenceParser } from '../../../../../src/http/input/preferences/AcceptPreferenceParser';
import type { HttpRequest } from '../../../../../src/server/HttpRequest';

describe('An AcceptPreferenceParser', (): void => {
  const preferenceParser = new AcceptPreferenceParser();
  let request: HttpRequest;
  beforeEach(async(): Promise<void> => {
    request = { headers: {}} as HttpRequest;
  });

  it('can handle all input.', async(): Promise<void> => {
    await expect(preferenceParser.canHandle({ request })).resolves.toBeUndefined();
  });

  it('returns an empty result if there is no relevant input.', async(): Promise<void> => {
    await expect(preferenceParser.handle({ request })).resolves.toEqual({});

    request.headers = { accept: '' };
    await expect(preferenceParser.handle({ request })).resolves.toEqual({});
  });

  it('parses accept headers.', async(): Promise<void> => {
    request.headers = { accept: 'audio/*; q=0.2, audio/basic' };
    await expect(preferenceParser.handle({ request }))
      .resolves.toEqual({ type: { 'audio/basic': 1, 'audio/*': 0.2 }});
  });

  it('parses accept-charset headers.', async(): Promise<void> => {
    request.headers = { 'accept-charset': 'iso-8859-5, unicode-1-1;q=0.8' };
    await expect(preferenceParser.handle({ request }))
      .resolves.toEqual({ charset: { 'iso-8859-5': 1, 'unicode-1-1': 0.8 }});
  });

  it('parses accept-datetime headers.', async(): Promise<void> => {
    request.headers = { 'accept-datetime': 'Tue, 20 Mar 2001 20:35:00 GMT' };
    await expect(preferenceParser.handle({ request }))
      .resolves.toEqual({ datetime: { 'Tue, 20 Mar 2001 20:35:00 GMT': 1 }});
  });

  it('parses accept-encoding headers.', async(): Promise<void> => {
    request.headers = { 'accept-encoding': 'gzip;q=1.0, identity; q=0.5, *;q=0' };
    await expect(preferenceParser.handle({ request }))
      .resolves.toEqual({ encoding: { gzip: 1, identity: 0.5, '*': 0 }});
  });

  it('parses accept-language headers.', async(): Promise<void> => {
    request.headers = { 'accept-language': 'da, en-gb;q=0.8, en;q=0.7' };
    await expect(preferenceParser.handle({ request }))
      .resolves.toEqual({ language: { da: 1, 'en-gb': 0.8, en: 0.7 }});
  });
});
