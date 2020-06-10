import { HttpRequest } from '../../../../src/server/HttpRequest';
import { SimplePreferenceParser } from '../../../../src/ldp/http/SimplePreferenceParser';

describe('A SimplePreferenceParser', (): void => {
  const preferenceParser = new SimplePreferenceParser();

  it('can handle all input.', async(): Promise<void> => {
    await expect(preferenceParser.canHandle()).resolves.toBeUndefined();
  });

  it('returns an empty result if there is no relevant input.', async(): Promise<void> => {
    await expect(preferenceParser.handle({ headers: {}} as HttpRequest)).resolves.toEqual({});
  });

  it('parses accept headers.', async(): Promise<void> => {
    await expect(preferenceParser.handle({ headers: { accept: 'audio/*; q=0.2, audio/basic' }} as HttpRequest))
      .resolves.toEqual({ type: [{ value: 'audio/*', weight: 0.2 }, { value: 'audio/basic' }]});
  });

  it('parses accept-charset headers.', async(): Promise<void> => {
    await expect(preferenceParser.handle({ headers: { 'accept-charset': 'iso-8859-5, unicode-1-1;q=0.8' }} as unknown as HttpRequest))
      .resolves.toEqual({ charset: [{ value: 'iso-8859-5' }, { value: 'unicode-1-1', weight: 0.8 }]});
  });

  it('parses accept-datetime headers.', async(): Promise<void> => {
    await expect(preferenceParser.handle({ headers: { 'accept-datetime': 'Tue, 20 Mar 2001 20:35:00 GMT' }} as unknown as HttpRequest))
      .resolves.toEqual({ datetime: [{ value: 'Tue, 20 Mar 2001 20:35:00 GMT' }]});
  });

  it('parses accept-language headers.', async(): Promise<void> => {
    await expect(preferenceParser.handle({ headers: { 'accept-language': 'da, en-gb;q=0.8, en;q=0.7' }} as HttpRequest))
      .resolves.toEqual({ language: [{ value: 'da' }, { value: 'en-gb', weight: 0.8 }, { value: 'en', weight: 0.7 }]});
  });
});
