import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import type { BodyParserArgs } from '../../../../src/ldp/http/BodyParser';
import { RawBodyParser } from '../../../../src/ldp/http/RawBodyParser';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import 'jest-rdf';
import type { HttpRequest } from '../../../../src/server/HttpRequest';

describe('A RawBodyparser', (): void => {
  const bodyParser = new RawBodyParser();
  let input: BodyParserArgs;

  beforeEach(async(): Promise<void> => {
    input = { request: { headers: {}} as HttpRequest, metadata: new RepresentationMetadata() };
  });

  it('accepts all input.', async(): Promise<void> => {
    await expect(bodyParser.canHandle()).resolves.toBeUndefined();
  });

  it('returns empty output if there was no content length or transfer encoding.', async(): Promise<void> => {
    input.request = streamifyArray([ '' ]) as HttpRequest;
    input.request.headers = {};
    await expect(bodyParser.handle(input)).resolves.toBeUndefined();
  });

  it('errors when a content length was specified without content type.', async(): Promise<void> => {
    input.request = streamifyArray([ 'abc' ]) as HttpRequest;
    input.request.headers = { 'content-length': '0' };
    await expect(bodyParser.handle(input)).rejects
      .toThrow('An HTTP request body was passed without Content-Type header');
  });

  it('errors when a transfer encoding was specified without content type.', async(): Promise<void> => {
    input.request = streamifyArray([ 'abc' ]) as HttpRequest;
    input.request.headers = { 'transfer-encoding': 'chunked' };
    await expect(bodyParser.handle(input)).rejects
      .toThrow('An HTTP request body was passed without Content-Type header');
  });

  it('returns a Representation if there was data.', async(): Promise<void> => {
    input.request = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    input.request.headers = { 'transfer-encoding': 'chunked', 'content-type': 'text/turtle' };
    const result = (await bodyParser.handle(input))!;
    expect(result).toEqual({
      binary: true,
      data: input.request,
      metadata: input.metadata,
    });
    await expect(arrayifyStream(result.data)).resolves.toEqual(
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
  });
});
