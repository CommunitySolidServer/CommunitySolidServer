import arrayifyStream from 'arrayify-stream';
import { DATA_TYPE_BINARY } from '../../../../src/util/ContentTypes';
import { HttpRequest } from '../../../../src/server/HttpRequest';
import { Readable } from 'stream';
import { SimpleBodyParser } from '../../../../src/ldp/http/SimpleBodyParser';
import streamifyArray from 'streamify-array';
import 'jest-rdf';

describe('A SimpleBodyparser', (): void => {
  const bodyParser = new SimpleBodyParser();

  it('accepts all input.', async(): Promise<void> => {
    await expect(bodyParser.canHandle()).resolves.toBeUndefined();
  });

  it('returns empty output if there was no content-type.', async(): Promise<void> => {
    await expect(bodyParser.handle({ headers: { }} as HttpRequest)).resolves.toBeUndefined();
  });

  it('returns a Representation if there was data.', async(): Promise<void> => {
    const input = streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]) as HttpRequest;
    input.headers = { 'content-type': 'text/turtle' };
    const result = (await bodyParser.handle(input))!;
    expect(result).toEqual({
      data: expect.any(Readable),
      dataType: DATA_TYPE_BINARY,
      metadata: {
        contentType: 'text/turtle',
        profiles: [],
        raw: [],
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqual(
      [ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ],
    );
  });
});
