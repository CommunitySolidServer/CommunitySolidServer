import type { HttpResponse } from '../../../src/server/HttpResponse';
import { BadRequestHttpError } from '../../../src/util/errors/BadRequestHttpError';
import { ContentType } from '../../../src/util/Header';
import {
  addHeader,
  hasScheme,
  matchesAuthorizationScheme,
  parseAccept,
  parseAcceptCharset,
  parseAcceptDateTime,
  parseAcceptEncoding,
  parseAcceptLanguage,
  parseContentType,
  parseForwarded,
  parseLinkHeader,
} from '../../../src/util/HeaderUtil';

describe('HeaderUtil', (): void => {
  describe('#parseAccept', (): void => {
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
      expect(parseAccept(
        'text/html;q=0.7, text/html;level=1, text/html;level=2;q=0.4,text/x-dvi; q=0.8; mxb=100000; mxt',
      )).toEqual([
        { range: 'text/html', weight: 1, parameters: { mediaType: { level: '1' }, extension: {}}},
        { range: 'text/x-dvi', weight: 0.8, parameters: { mediaType: {}, extension: { mxb: '100000', mxt: '' }}},
        { range: 'text/html', weight: 0.7, parameters: { mediaType: {}, extension: {}}},
        { range: 'text/html', weight: 0.4, parameters: { mediaType: { level: '2' }, extension: {}}},
      ]);
    });

    it('parses Accept headers with double quoted values.', async(): Promise<void> => {
      expect(parseAccept('audio/basic; param1="val" ; q=0.5 ;param2="\\\\\\"valid"')).toEqual([
        {
          range: 'audio/basic',
          weight: 0.5,
          parameters: { mediaType: { param1: 'val' }, extension: { param2: '\\\\\\"valid' }},
        },
      ]);
    });

    it('ignores Accept Headers with invalid types.', async(): Promise<void> => {
      expect(parseAccept('*')).toEqual([]);
      expect(parseAccept('"bad"/text')).toEqual([]);
      expect(parseAccept('*/\\bad')).toEqual([]);
      expect(parseAccept('*/*')).toEqual([
        { parameters: { extension: {}, mediaType: {}}, range: '*/*', weight: 1 },
      ]);
    });

    it('ignores the weight of Accept Headers with q values it can not parse.', async(): Promise<void> => {
      expect(parseAccept('a/b; q=text')).toEqual([
        { range: 'a/b', weight: 1, parameters: { extension: {}, mediaType: {}}},
      ]);
      // Invalid Q value but can be parsed
      expect(parseAccept('a/b; q=0.1234')).toEqual([
        { range: 'a/b', weight: 0.1234, parameters: { extension: {}, mediaType: {}}},
      ]);
      expect(parseAccept('a/b; q=1.1')).toEqual([
        { range: 'a/b', weight: 1, parameters: { extension: {}, mediaType: {}}},
      ]);
      expect(parseAccept('a/b; q=1.000')).toEqual([
        { range: 'a/b', weight: 1, parameters: { extension: {}, mediaType: {}}},
      ]);
      expect(parseAccept('a/b; q=-5')).toEqual([
        { range: 'a/b', weight: 0, parameters: { extension: {}, mediaType: {}}},
      ]);
      expect(parseAccept('a/b; q=0.123')).toEqual([
        { range: 'a/b', weight: 0.123, parameters: { extension: {}, mediaType: {}}},
      ]);
    });

    it('ignores Accept Headers with invalid parameters.', async(): Promise<void> => {
      expect(parseAccept('a/b; a')).toEqual([
        { range: 'a/b', weight: 1, parameters: { extension: {}, mediaType: {}}},
      ]);
      expect(parseAccept('a/b; a=\\')).toEqual([
        { range: 'a/b', weight: 1, parameters: { extension: {}, mediaType: {}}},
      ]);
      expect(parseAccept('a/b; q=1 ; a=\\')).toEqual([
        { range: 'a/b', weight: 1, parameters: { extension: {}, mediaType: {}}},
      ]);
      expect(parseAccept('a/b; q=1 ; a')).toEqual([
        { range: 'a/b', weight: 1, parameters: { extension: { a: '' }, mediaType: {}}},
      ]);
    });

    it('rejects Accept Headers with quoted parameters.', async(): Promise<void> => {
      expect((): any => parseAccept('a/b; a="\\""')).not.toThrow();
      expect((): any => parseAccept('a/b; a="\\\u007F"')).toThrow('Invalid quoted string in header:');
    });

    it('rejects invalid values when strict mode is enabled.', async(): Promise<void> => {
      expect((): any => parseAccept('"bad"/text', true)).toThrow(BadRequestHttpError);
      expect((): any => parseAccept('a/b; q=text', true)).toThrow(BadRequestHttpError);
      expect((): any => parseAccept('a/b; a', true)).toThrow(BadRequestHttpError);
    });
  });

  describe('#parseCharset', (): void => {
    it('parses Accept-Charset headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('iso-8859-5, unicode-1-1;q=0.8')).toEqual([
        { range: 'iso-8859-5', weight: 1 },
        { range: 'unicode-1-1', weight: 0.8 },
      ]);
    });

    it('ignores invalid Accept-Charset Headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('a/b')).toEqual([]);
      expect(parseAcceptCharset('a; q=text')).toEqual([{ range: 'a', weight: 1 }]);
      expect(parseAcceptCharset('a; c=d')).toEqual([{ range: 'a', weight: 1 }]);
    });

    it('rejects invalid values when strict mode is enabled.', async(): Promise<void> => {
      expect((): any => parseAcceptCharset('a/b', true)).toThrow(BadRequestHttpError);
    });
  });

  describe('#parseEncoding', (): void => {
    it('parses empty Accept-Encoding headers.', async(): Promise<void> => {
      expect(parseAcceptCharset('')).toEqual([]);
    });

    it('parses Accept-Encoding headers.', async(): Promise<void> => {
      expect(parseAcceptEncoding('gzip;q=1.000, identity; q=0.5, *;q=0')).toEqual([
        { range: 'gzip', weight: 1 },
        { range: 'identity', weight: 0.5 },
        { range: '*', weight: 0 },
      ]);
    });

    it('ignores invalid Accept-Encoding Headers.', async(): Promise<void> => {
      expect(parseAcceptEncoding('a/b')).toEqual([]);
      expect(parseAcceptEncoding('a; q=text')).toEqual([{ range: 'a', weight: 1 }]);
      expect(parseAcceptCharset('a; c=d')).toEqual([{ range: 'a', weight: 1 }]);
    });

    it('rejects invalid values when strict mode is enabled.', async(): Promise<void> => {
      expect((): any => parseAcceptEncoding('a/b', true)).toThrow(BadRequestHttpError);
    });
  });

  describe('#parseLanguage', (): void => {
    it('parses Accept-Language headers.', async(): Promise<void> => {
      expect(parseAcceptLanguage('da, en-gb;q=0.8, en;q=0.7')).toEqual([
        { range: 'da', weight: 1 },
        { range: 'en-gb', weight: 0.8 },
        { range: 'en', weight: 0.7 },
      ]);
    });

    it('ignores invalid Accept-Language Headers.', async(): Promise<void> => {
      expect(parseAcceptLanguage('a/b')).toEqual([]);
      expect(parseAcceptLanguage('05-a')).toEqual([]);
      expect(parseAcceptLanguage('a--05')).toEqual([]);
      expect(parseAcceptLanguage('a-"a"')).toEqual([]);
      expect(parseAcceptLanguage('a-05')).toEqual([{ range: 'a-05', weight: 1 }]);
      expect(parseAcceptLanguage('a-b-c-d')).toEqual([{ range: 'a-b-c-d', weight: 1 }]);

      expect(parseAcceptLanguage('a; q=text')).toEqual([{ range: 'a', weight: 1 }]);
      expect(parseAcceptCharset('a; c=d')).toEqual([{ range: 'a', weight: 1 }]);
    });

    it('rejects invalid values when strict mode is enabled.', async(): Promise<void> => {
      expect((): any => parseAcceptLanguage('a/b', true)).toThrow(BadRequestHttpError);
    });
  });

  describe('#parseAcceptDateTime', (): void => {
    it('parses valid Accept-DateTime Headers.', async(): Promise<void> => {
      expect(parseAcceptDateTime('Wed, 30 May 2007 18:47:52 GMT')).toEqual([
        { range: 'Wed, 30 May 2007 18:47:52 GMT', weight: 1 },
      ]);
    });

    it('parses empty Accept-DateTime headers.', async(): Promise<void> => {
      expect(parseAcceptDateTime('')).toEqual([]);
      expect(parseAcceptDateTime('   ')).toEqual([]);
    });

    it('ignores invalid Accept-DateTime Headers.', async(): Promise<void> => {
      expect(parseAcceptDateTime('a/b')).toEqual([]);
      expect(parseAcceptDateTime('30 May 2007')).toEqual([]);
    });

    it('rejects invalid values when strict mode is enabled.', async(): Promise<void> => {
      expect((): any => parseAcceptLanguage('a/b', true)).toThrow(BadRequestHttpError);
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

  describe('#parseContentType', (): void => {
    const contentTypeTurtle = 'text/turtle';
    const contentTypePlain: any = {
      value: 'text/plain',
      parameters: {
        charset: 'utf-8',
      },
    };
    it('handles single content-type parameter (with leading and trailing whitespaces).', (): void => {
      expect(parseContentType('text/turtle').value).toEqual(contentTypeTurtle);
      expect(parseContentType('text/turtle ').value).toEqual(contentTypeTurtle);
      expect(parseContentType(' text/turtle').value).toEqual(contentTypeTurtle);
      expect(parseContentType('text/plain; charset=utf-8')).toEqual(contentTypePlain);
      expect(parseContentType(' text/plain; charset=utf-8')).toEqual(contentTypePlain);
      expect(parseContentType('text/plain ; charset=utf-8')).toEqual(contentTypePlain);
      expect(parseContentType(' text/plain ; charset=utf-8')).toEqual(contentTypePlain);
      expect(parseContentType(' text/plain ; charset="utf-8"')).toEqual(contentTypePlain);
      expect(parseContentType(' text/plain ; charset = "utf-8"')).toEqual(contentTypePlain);
    });

    it('handles multiple content-type parameters.', (): void => {
      expect(parseContentType('text/turtle; charset=UTF-8').value).toEqual(contentTypeTurtle);
      contentTypePlain.parameters.test = 'value1';
      expect(parseContentType('text/plain; charset=utf-8;test="value1"')).toEqual(contentTypePlain);
    });

    it('errors on invalid content-types.', (): void => {
      expect((): any => parseContentType('invalid type')).toThrow(BadRequestHttpError);
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

  describe('#parseLinkHeader', (): void => {
    it('handles an empty set of headers.', (): void => {
      expect(parseLinkHeader([])).toEqual([]);
    });

    it('handles empty string values.', (): void => {
      expect(parseLinkHeader([ '' ])).toEqual([]);
    });

    it('parses a Link header value as array.', (): void => {
      const link = [ '<http://test.com>; rel="myRel"; test="value1"' ];
      expect(parseLinkHeader(link)).toEqual([
        {
          target: 'http://test.com',
          parameters: {
            rel: 'myRel',
            test: 'value1',
          },
        },
      ]);
    });

    it('parses a Link header value as string.', (): void => {
      const link = '<http://test.com>; rel="myRel"; test="value1"';
      expect(parseLinkHeader(link)).toEqual([
        {
          target: 'http://test.com',
          parameters: {
            rel: 'myRel',
            test: 'value1',
          },
        },
      ]);
    });

    it('parses multiple Link header values delimited by a comma.', (): void => {
      const link = [ `<http://test.com>; rel="myRel"; test="value1", 
      <http://test2.com>; rel="myRel2"; test="value2"` ];
      expect(parseLinkHeader(link)).toEqual([
        {
          target: 'http://test.com',
          parameters: {
            rel: 'myRel',
            test: 'value1',
          },
        },
        {
          target: 'http://test2.com',
          parameters: {
            rel: 'myRel2',
            test: 'value2',
          },
        },
      ]);
    });

    it('parses multiple Link header values as array elements.', (): void => {
      const link = [
        '<http://test.com>; rel="myRel"; test="value1"',
        '<http://test2.com>; rel="myRel2"; test="value2"',
      ];
      expect(parseLinkHeader(link)).toEqual([
        {
          target: 'http://test.com',
          parameters: {
            rel: 'myRel',
            test: 'value1',
          },
        },
        {
          target: 'http://test2.com',
          parameters: {
            rel: 'myRel2',
            test: 'value2',
          },
        },
      ]);
    });

    it('ignores invalid syntax links.', (): void => {
      const link = [
        'http://test.com; rel="myRel"; test="value1"',
        '<http://test2.com>; rel="myRel2"; test="value2"',
      ];
      expect(parseLinkHeader(link)).toEqual([
        {
          target: 'http://test2.com',
          parameters: {
            rel: 'myRel2',
            test: 'value2',
          },
        },
      ]);
    });

    it('ignores invalid links (no rel parameter).', (): void => {
      const link = [
        '<http://test.com>; att="myAtt"; test="value1"',
        '<http://test2.com>; rel="myRel2"; test="value2"',
      ];
      expect(parseLinkHeader(link)).toEqual([
        {
          target: 'http://test2.com',
          parameters: {
            rel: 'myRel2',
            test: 'value2',
          },
        },
      ]);
    });

    it('ignores extra rel parameters.', (): void => {
      const link = [
        '<http://test.com>; rel="myRel1"; rel="myRel2"; test="value1"',
      ];
      expect(parseLinkHeader(link)).toEqual([
        {
          target: 'http://test.com',
          parameters: {
            rel: 'myRel1',
            test: 'value1',
          },
        },
      ]);
    });

    it('works with an empty argument.', (): void => {
      expect(parseLinkHeader()).toEqual([]);
    });
  });

  describe('#matchesAuthorizationScheme', (): void => {
    it('returns true if the provided authorization header value matches the provided scheme.', (): void => {
      const authorization = `Bearer Q0xXTzl1dTM4RF8xLXllSGx5am51WFUzbzZ2LTZ1WU1GWXpfMTBEajBjaw==`;
      expect(matchesAuthorizationScheme('Bearer', authorization)).toBeTruthy();
    });

    it('returns false if the provided authorization header value does not match the provided scheme.', (): void => {
      const authorization = `Basic YWxpY2U6YWxpY2U=`;
      expect(matchesAuthorizationScheme('Bearer', authorization)).toBeFalsy();
    });

    it('correctly detects scheme matches when a different casing is used.', (): void => {
      const authorization = `bAsIc YWxpY2U6YWxpY2U=`;
      expect(matchesAuthorizationScheme('Basic', authorization)).toBeTruthy();
    });

    it('escapes special regex characters in the scheme argument, resulting in a correct match.', (): void => {
      const authorization = `bA.*sIc$ YWxpY2U6YWxpY2U=`;
      expect(matchesAuthorizationScheme('bA.*sIc$', authorization)).toBeTruthy();
    });

    it('returns false if the authorization argument is undefined.', (): void => {
      expect(matchesAuthorizationScheme('Bearer')).toBeFalsy();
    });
  });

  describe('#hasScheme', (): void => {
    it('returns true if the provided url matches the provided scheme.', (): void => {
      expect(hasScheme('http://example.com', 'http')).toBeTruthy();
    });

    it('returns true if the provided url matches one of the provided schemes.', (): void => {
      expect(hasScheme('ws://example.com', 'http', 'https', 'ws')).toBeTruthy();
    });

    it('returns false if the provided url does not match the provided scheme.', (): void => {
      expect(hasScheme('http://example.com', 'https')).toBeFalsy();
    });

    it('returns false if the provided value is not a valid url.', (): void => {
      expect(hasScheme('not-a-URL:test', 'http')).toBeFalsy();
    });

    it('is case insensitive: schemes with different case, result in a correct match.', (): void => {
      expect(hasScheme('wss://example.com', 'http', 'WSS')).toBeTruthy();
    });
  });
  describe('A ContentType instance', (): void => {
    it('can serialize to a correct header value string with parameters.', (): void => {
      const contentType: ContentType = new ContentType(
        'text/plain',
        {
          charset: 'utf-8',
          extra: 'test',
        },
      );
      expect(contentType.toHeaderValueString()).toBe('text/plain; charset=utf-8; extra=test');
    });

    it('can serialize to a correct header value string without parameters.', (): void => {
      const contentType: ContentType = new ContentType('text/plain');
      expect(contentType.toHeaderValueString()).toBe('text/plain');
    });
  });
});
