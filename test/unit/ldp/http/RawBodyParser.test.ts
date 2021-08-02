import arrayifyStream from 'arrayify-stream';
import type { BodyParserArgs } from '../../../../src/ldp/http/BodyParser';
import { RawBodyParser } from '../../../../src/ldp/http/RawBodyParser';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import 'jest-rdf';
import type { HttpRequest } from '../../../../src/server/HttpRequest';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

describe('A RawBodyparser', (): void => {
  const bodyParser = new RawBodyParser();
  let input: BodyParserArgs;

  beforeEach(async(): Promise<void> => {
    input = { request: { headers: {}} as HttpRequest, metadata: new RepresentationMetadata() };
  });

  it('accepts all input.', async(): Promise<void> => {
    await expect(bodyParser.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('returns empty output if there is no content length or transfer encoding.', async(): Promise<void> => {
    input.request = guardedStreamFrom([ '' ]) as HttpRequest;
    input.request.headers = {};
    await expect(bodyParser.handle(input)).resolves.toBeUndefined();
  });

  // https://github.com/solid/community-server/issues/498
  it('returns empty output if the content length is 0 and there is no content type.', async(): Promise<void> => {
    input.request = guardedStreamFrom([ '' ]) as HttpRequest;
    input.request.headers = { 'content-length': '0' };
    await expect(bodyParser.handle(input)).resolves.toBeUndefined();
  });

  it('errors when a content length is specified without content type.', async(): Promise<void> => {
    input.request = guardedStreamFrom([ 'abc' ]) as HttpRequest;
    input.request.headers = { 'content-length': '1' };
    await expect(bodyParser.handle(input)).rejects
      .toThrow('HTTP request body was passed without a Content-Type header');
  });

  it('errors when a transfer encoding is specified without content type.', async(): Promise<void> => {
    input.request = guardedStreamFrom([ 'abc' ]) as HttpRequest;
    input.request.headers = { 'transfer-encoding': 'chunked' };
    await expect(bodyParser.handle(input)).rejects
      .toThrow('HTTP request body was passed without a Content-Type header');
  });

  it('returns a Representation if there is empty data.', async(): Promise<void> => {
    input.request = guardedStreamFrom([]) as HttpRequest;
    input.request.headers = { 'content-length': '0', 'content-type': 'text/turtle' };
    const result = (await bodyParser.handle(input))!;
    expect(result).toEqual({
      binary: true,
      data: input.request,
      metadata: input.metadata,
    });
    await expect(arrayifyStream(result.data)).resolves.toEqual([]);
  });

  it('returns a Representation if there is non-empty data.', async(): Promise<void> => {
    input.request = guardedStreamFrom([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
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
