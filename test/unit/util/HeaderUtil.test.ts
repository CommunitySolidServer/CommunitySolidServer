import type { HttpResponse } from '../../../src/server/HttpResponse';
import {
  addHeader,
  parseAccept,
  parseAcceptCharset,
  parseAcceptDateTime,
  parseAcceptEncoding,
  parseAcceptLanguage,
  parseForwarded,
} from '../../../src/util/HeaderUtil';

describe('HeaderUtil', (): void => {
  describe('#parseAccept', (): void => {
    it('parses empty Accept headers.', async(): Promise<void> => {
      expect(parseAccept('')).toEqual({});
    });

    it('parses Accept headers with a single entry.', async(): Promise<void> => {
      expect(parseAccept('audio/basic')).toEqual({
        'audio/basic': 1,
      });
    });

    it('parses Accept headers with multiple entries.', async(): Promise<void> => {
      expect(parseAccept('audio/*; q=0.2, audio/basic')).toEqual({
        'audio/basic': 1,
        'audio/*': 0.2,
      });
    });

    it('parses complex Accept headers.', async(): Promise<void> => {
      expect(parseAccept(
        'text/html;q=0.7, text/html;level=1, text/html;level=2;q=0.4,text/x-dvi; q=0.8; mxb=100000; mxt',
      )).toEqual({
        'text/x-dvi': 0.8,
        'text/html': 0.4,
      });
    });

    it('parses Accept headers with double quoted values.', async(): Promise<void> => {
      expect(parseAccept('audio/basic; param1="val" ; q=0.5 ;param2="\\\\\\"valid"')).toEqual({
        'audio/basic': 0.5,
      });
    });

    it('rejects Accept Headers with invalid types.', async(): Promise<void> => {
      expect((): any => parseAccept('*')).toThrow('Invalid Accept range:');
      expect((): any => parseAccept('"bad"/text')).toThrow('Invalid Accept range:');
      expect((): any => parseAccept('*/\\bad')).toThrow('Invalid Accept range:');
      expect((): any => parseAccept('*/*')).not.toThrow('Invalid Accept range:');
    });

    it('rejects Accept Headers with invalid q values.', async(): Promise<void> => {
      expect((): any => parseAccept('a/b; q=text')).toThrow('Invalid q value:');
      expect((): any => parseAccept('a/b; q=0.1234')).toThrow('Invalid q value:');
      expect((): any => parseAccept('a/b; q=1.1')).toThrow('Invalid q value:');
      expect((): any => parseAccept('a/b; q=1.000')).not.toThrow();
      expect((): any => parseAccept('a/b; q=0.123')).not.toThrow();
    });

    it('rejects Accept Headers with invalid parameters.', async(): Promise<void> => {
      expect((): any => parseAccept('a/b; a')).toThrow('Invalid Accept parameter');
      expect((): any => parseAccept('a/b; a=\\')).toThrow('Invalid parameter value');
      expect((): any => parseAccept('a/b; q=1 ; a=\\')).toThrow('Invalid parameter value');
      expect((): any => parseAccept('a/b; q=1 ; a')).not.toThrow('Invalid Accept parameter');
    });

    it('rejects Accept Headers with quoted parameters.', async(): Promise<void> => {
      expect((): any => parseAccept('a/b; a="\\""')).not.toThrow();
      expect((): any => parseAccept('a/b; a="\\\u007F"')).toThrow('Invalid quoted string in header:');
    });
  });

  describe('#parseCharset', (): void => {
    it('parses Accept-Charset headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('iso-8859-5, unicode-1-1;q=0.8')).toEqual({
        'iso-8859-5': 1,
        'unicode-1-1': 0.8,
      });
    });

    it('rejects invalid Accept-Charset Headers.', async(): Promise<void> => {
      expect((): any => parseAcceptCharset('a/b')).toThrow('Invalid Accept-Charset range:');
      expect((): any => parseAcceptCharset('a; q=text')).toThrow('Invalid q value:');
      expect((): any => parseAcceptCharset('a; c=d')).toThrow('Only q parameters are allowed');
    });
  });

  describe('#parseEncoding', (): void => {
    it('parses empty Accept-Encoding headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('')).toEqual({});
    });

    it('parses Accept-Encoding headers.', async(): Promise<void> => {
      expect(parseAcceptEncoding('gzip;q=1.000, identity; q=0.5, *;q=0')).toEqual({
        // eslint-disable-next-line quote-props
        'gzip': 1,
        // eslint-disable-next-line quote-props
        'identity': 0.5,
        '*': 0,
      });
    });

    it('rejects invalid Accept-Encoding Headers.', async(): Promise<void> => {
      expect((): any => parseAcceptEncoding('a/b')).toThrow('Invalid Accept-Encoding range:');
      expect((): any => parseAcceptEncoding('a; q=text')).toThrow('Invalid q value:');
      expect((): any => parseAcceptCharset('a; c=d')).toThrow('Only q parameters are allowed');
    });
  });

  describe('#parseLanguage', (): void => {
    it('parses Accept-Language headers.', async(): Promise<void> => {
      expect(parseAcceptLanguage('da, en-gb;q=0.8, en;q=0.7')).toEqual({
        // eslint-disable-next-line quote-props
        'da': 1,
        'en-gb': 0.8,
        // eslint-disable-next-line quote-props
        'en': 0.7,
      });
    });

    it('rejects invalid Accept-Language Headers.', async(): Promise<void> => {
      expect((): any => parseAcceptLanguage('a/b')).toThrow('Invalid Accept-Language range:');
      expect((): any => parseAcceptLanguage('05-a')).toThrow('Invalid Accept-Language range:');
      expect((): any => parseAcceptLanguage('a--05')).toThrow('Invalid Accept-Language range:');
      expect((): any => parseAcceptLanguage('a-"a"')).toThrow('Invalid Accept-Language range:');
      expect((): any => parseAcceptLanguage('a-05')).not.toThrow('Invalid Accept-Language range:');
      expect((): any => parseAcceptLanguage('a-b-c-d')).not.toThrow('Invalid Accept-Language range:');

      expect((): any => parseAcceptLanguage('a; q=text')).toThrow('Invalid q value:');
      expect((): any => parseAcceptCharset('a; c=d')).toThrow('Only q parameters are allowed');
    });
  });

  describe('#parseAcceptDateTime', (): void => {
    it('parses valid Accept-DateTime Headers.', async(): Promise<void> => {
      expect(parseAcceptDateTime('Wed, 30 May 2007 18:47:52 GMT')).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Wed, 30 May 2007 18:47:52 GMT': 1,
      });
    });

    it('parses empty Accept-DateTime headers.', async(): Promise<void> => {
      expect(parseAcceptDateTime('')).toEqual({});
      expect(parseAcceptDateTime('   ')).toEqual({});
    });

    it('rejects invalid Accept-DateTime Headers.', async(): Promise<void> => {
      expect((): any => parseAcceptDateTime('a/b')).toThrow('Invalid Accept-DateTime range:');
      expect((): any => parseAcceptDateTime('30 May 2007')).toThrow('Invalid Accept-DateTime range:');
    });
  });

  describe('#addHeader', (): void => {
    let response: HttpResponse;

    beforeEach(async(): Promise<void> => {
      const headers: Record<string, string | number | string[]> = {};
      response = {
        hasHeader: (name: string): boolean => Boolean(headers[name]),
        getHeader: (name: string): number | string | string[] | undefined => headers[name],
        setHeader(name: string, value: number | string | string[]): void {
          headers[name] = value;
        },
      } as any;
    });

    it('adds values if there are none already.', async(): Promise<void> => {
      expect(addHeader(response, 'name', 'value')).toBeUndefined();
      expect(response.getHeader('name')).toBe('value');

      expect(addHeader(response, 'names', [ 'value1', 'values2' ])).toBeUndefined();
      expect(response.getHeader('names')).toEqual([ 'value1', 'values2' ]);
    });

    it('appends values to already existing values.', async(): Promise<void> => {
      response.setHeader('name', 'oldValue');
      expect(addHeader(response, 'name', 'value')).toBeUndefined();
      expect(response.getHeader('name')).toEqual([ 'oldValue', 'value' ]);

      response.setHeader('number', 5);
      expect(addHeader(response, 'number', 'value')).toBeUndefined();
      expect(response.getHeader('number')).toEqual([ '5', 'value' ]);

      response.setHeader('names', [ 'oldValue1', 'oldValue2' ]);
      expect(addHeader(response, 'names', [ 'value1', 'values2' ])).toBeUndefined();
      expect(response.getHeader('names')).toEqual([ 'oldValue1', 'oldValue2', 'value1', 'values2' ]);
    });
  });

  describe('#parseForwarded', (): void => {
    it('handles an empty set of headers.', (): void => {
      expect(parseForwarded({})).toEqual({});
    });

    it('handles empty string values.', (): void => {
      const headers = { forwarded: '', 'x-forwarded-host': '', 'x-forwarded-proto': '' };
      expect(parseForwarded(headers)).toEqual({});
    });

    it('parses a Forwarded header value.', (): void => {
      const headers = { forwarded: 'for=192.0.2.60;proto=http;by=203.0.113.43;host=example.org' };
      expect(parseForwarded(headers)).toEqual({
        by: '203.0.113.43',
        for: '192.0.2.60',
        host: 'example.org',
        proto: 'http',
      });
    });

    it('skips empty fields.', (): void => {
      const headers = { forwarded: 'for=192.0.2.60;proto=;by=;host=' };
      expect(parseForwarded(headers)).toEqual({
        for: '192.0.2.60',
      });
    });

    it('takes only the first value into account.', (): void => {
      const headers = { forwarded: 'host=pod.example, for=192.0.2.43, host=other' };
      expect(parseForwarded(headers)).toEqual({
        host: 'pod.example',
      });
    });

    it('should fall back to X-Forwarded-Host and X-Forwarded-Proto without Forward header.', (): void => {
      const headers = { 'x-forwarded-host': 'pod.example', 'x-forwarded-proto': 'https' };
      expect(parseForwarded(headers)).toEqual({
        host: 'pod.example',
        proto: 'https',
      });
    });

    it('should prefer Forwarded to X-Forwarded-Host and X-Forwarded-Proto with Forward header.', (): void => {
      const headers = {
        forwarded: 'proto=http;host=pod.example',
        'x-forwarded-host': 'anotherpod.example',
        'x-forwarded-proto': 'https',
      };
      expect(parseForwarded(headers)).toEqual({
        host: 'pod.example',
        proto: 'http',
      });
    });

    it('should properly handle multiple values with varying spaces for X-Forwarded-*.', (): void => {
      const headers = {
        'x-forwarded-host': ' pod.example ,192.0.2.60, 192.0.2.43',
        'x-forwarded-proto': ' https ,http',
      };
      expect(parseForwarded(headers)).toEqual({
        host: 'pod.example',
        proto: 'https',
      });
    });
  });
});
