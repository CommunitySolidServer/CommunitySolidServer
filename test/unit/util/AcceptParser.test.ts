import { parseAccept, parseAcceptCharset, parseAcceptLanguage } from '../../../src/util/AcceptParser';

describe('AcceptParser', (): void => {
  describe('parseAccept function', (): void => {
    it('parses empty Accept headers.', async(): Promise<void> => {
      expect(parseAccept('')).toEqual([]);
    });

    it('parses Accept headers with a single entry.', async(): Promise<void> => {
      expect(parseAccept('audio/basic')).toEqual([
        { range: 'audio/basic', weight: 1, parameters: { mediaType: {}, extension: {}}},
      ]);
    });

    it('parses Accept headers with multiple entries.', async(): Promise<void> => {
      expect(parseAccept('audio/*; q=0.2, audio/basic')).toEqual([
        { range: 'audio/basic', weight: 1, parameters: { mediaType: {}, extension: {}}},
        { range: 'audio/*', weight: 0.2, parameters: { mediaType: {}, extension: {}}},
      ]);
    });

    it('parses complex Accept headers.', async(): Promise<void> => {
      expect(parseAccept('text/html;q=0.7, text/html;level=1, text/html;level=2;q=0.4,text/x-dvi; q=.8; mxb=100000; mxt')).toEqual([
        { range: 'text/html', weight: 1, parameters: { mediaType: { level: '1' }, extension: {}}},
        { range: 'text/x-dvi', weight: 0.8, parameters: { mediaType: {}, extension: { mxb: '100000', mxt: '' }}},
        { range: 'text/html', weight: 0.7, parameters: { mediaType: {}, extension: {}}},
        { range: 'text/html', weight: 0.4, parameters: { mediaType: { level: '2' }, extension: {}}},
      ]);
    });

    it('parses Accept headers with double quoted values.', async(): Promise<void> => {
      expect(parseAccept('audio/basic; param1="val" ; q=0.5 ;param2="\\\\\\"valid"')).toEqual([
        { range: 'audio/basic', weight: 0.5, parameters: { mediaType: { param1: '"val"' }, extension: { param2: '"\\\\\\"valid"' }}},
      ]);
    });
  });

  describe('parseCharset function', (): void => {
    it('parses Accept-Charset headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('iso-8859-5, unicode-1-1;q=0.8')).toEqual([
        { range: 'iso-8859-5', weight: 1 },
        { range: 'unicode-1-1', weight: 0.8 },
      ]);
    });
  });

  describe('parseEncoding function', (): void => {
    it('parses empty Accept-Encoding headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('')).toEqual([]);
    });

    it('parses Accept-Encoding headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('gzip;q=1.0, identity; q=0.5, *;q=0')).toEqual([
        { range: 'gzip', weight: 1 },
        { range: 'identity', weight: 0.5 },
        { range: '*', weight: 0 },
      ]);
    });
  });

  describe('parseLanguage function', (): void => {
    it('parses Accept-Language headers.', async(): Promise<void> => {
      expect(parseAcceptLanguage('da, en-gb;q=0.8, en;q=0.7')).toEqual([
        { range: 'da', weight: 1 },
        { range: 'en-gb', weight: 0.8 },
        { range: 'en', weight: 0.7 },
      ]);
    });
  });
});
