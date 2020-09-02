import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { RawBodyParser } from '../../../../src/ldp/http/RawBodyParser';
import { HttpRequest } from '../../../../src/server/HttpRequest';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import 'jest-rdf';

describe('A RawBodyparser', (): void => {
  const bodyParser = new RawBodyParser();

  it('accepts all input.', async(): Promise<void> => {
    await expect(bodyParser.canHandle()).resolves.toBeUndefined();
  });

  it('returns empty output if there was no content length or transfer encoding.', async(): Promise<void> => {
    const input = streamifyArray([ '' ]) as HttpRequest;
    input.headers = {};
    await expect(bodyParser.handle(input)).resolves.toBeUndefined();
  });

  it('errors when a content length was specified without content type.', async(): Promise<void> => {
    const input = streamifyArray([ 'abc' ]) as HttpRequest;
    input.headers = { 'content-length': '0' };
    await expect(bodyParser.handle(input)).rejects
      .toThrow('An HTTP request body was passed without Content-Type header');
  });

  it('errors when a transfer encoding was specified without content type.', async(): Promise<void> => {
    const input = streamifyArray([ 'abc' ]) as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked' };
    await expect(bodyParser.handle(input)).rejects
      .toThrow('An HTTP request body was passed without Content-Type header');
  });

  it('returns a Representation if there was data.', async(): Promise<void> => {
    const input = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked', 'content-type': 'text/turtle' };
    const result = (await bodyParser.handle(input))!;
    expect(result).toEqual({
      binary: true,
      data: input,
      metadata: {
        contentType: 'text/turtle',
        raw: [],
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqual(
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
  });

  it('adds the slug header to the metadata.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked', 'content-type': 'text/turtle', slug: 'slugText' };
    const result = (await bodyParser.handle(input))!;
    expect(result.metadata).toEqual({
      contentType: 'text/turtle',
      raw: [],
      slug: 'slugText',
    });
  });

  it('errors if there are multiple slugs.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked',
      'content-type': 'text/turtle',
      slug: [ 'slugTextA', 'slugTextB' ]};
    await expect(bodyParser.handle(input)).rejects.toThrow(UnsupportedHttpError);
  });

  it('adds the link headers to the metadata.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked',
      'content-type': 'text/turtle',
      link: '<http://www.w3.org/ns/ldp#Container>; rel="type"' };
    const result = (await bodyParser.handle(input))!;
    expect(result.metadata).toEqual({
      contentType: 'text/turtle',
      raw: [],
      linkRel: { type: new Set([ 'http://www.w3.org/ns/ldp#Container' ]) },
    });
  });

  it('supports multiple link headers.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked',
      'content-type': 'text/turtle',
      link: [ '<http://www.w3.org/ns/ldp#Container>; rel="type"',
        '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
        '<unrelatedLink>',
        'badLink',
      ]};
    const result = (await bodyParser.handle(input))!;
    expect(result.metadata).toEqual({
      contentType: 'text/turtle',
      raw: [],
      linkRel: { type: new Set([ 'http://www.w3.org/ns/ldp#Container', 'http://www.w3.org/ns/ldp#Resource' ]) },
    });
  });
});
