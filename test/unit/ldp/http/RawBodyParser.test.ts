import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { RawBodyParser } from '../../../../src/ldp/http/RawBodyParser';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { HttpRequest } from '../../../../src/server/HttpRequest';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import 'jest-rdf';
import { CONTENT_TYPE, SLUG, TYPE } from '../../../../src/util/MetadataTypes';

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
      metadata: expect.any(RepresentationMetadata),
    });
    expect(result.metadata.get(CONTENT_TYPE)?.value).toEqual('text/turtle');
    await expect(arrayifyStream(result.data)).resolves.toEqual(
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
  });

  it('adds the slug header to the metadata.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked', 'content-type': 'text/turtle', slug: 'slugText' };
    const result = (await bodyParser.handle(input))!;
    expect(result.metadata.get(CONTENT_TYPE)?.value).toEqual('text/turtle');
    expect(result.metadata.get(SLUG)?.value).toEqual('slugText');
  });

  it('errors if there are multiple slugs.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked',
      'content-type': 'text/turtle',
      slug: [ 'slugTextA', 'slugTextB' ]};
    await expect(bodyParser.handle(input)).rejects.toThrow(UnsupportedHttpError);
  });

  it('adds the link type headers to the metadata.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked',
      'content-type': 'text/turtle',
      link: '<http://www.w3.org/ns/ldp#Container>; rel="type"' };
    const result = (await bodyParser.handle(input))!;
    expect(result.metadata.get(CONTENT_TYPE)?.value).toEqual('text/turtle');
    expect(result.metadata.get(TYPE)?.value).toEqual('http://www.w3.org/ns/ldp#Container');
  });

  it('ignores unknown link headers.', async(): Promise<void> => {
    const input = {} as HttpRequest;
    input.headers = { 'transfer-encoding': 'chunked',
      'content-type': 'text/turtle',
      link: [ '<unrelatedLink>', 'badLink' ]};
    const result = (await bodyParser.handle(input))!;
    expect(result.metadata.quads()).toHaveLength(1);
    expect(result.metadata.get(CONTENT_TYPE)?.value).toEqual('text/turtle');
  });
});
