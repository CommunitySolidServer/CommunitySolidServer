import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { MockResponse } from 'node-mocks-http';
import { createResponse } from 'node-mocks-http';
import { BasicResponseWriter } from '../../../../src/http/output/BasicResponseWriter';
import type { MetadataWriter } from '../../../../src/http/output/metadata/MetadataWriter';
import type { ResponseDescription } from '../../../../src/http/output/response/ResponseDescription';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import { INTERNAL_QUADS } from '../../../../src/util/ContentTypes';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('A BasicResponseWriter', (): void => {
  let metadataWriter: MetadataWriter;
  let writer: BasicResponseWriter;
  let response: MockResponse<any>;
  let result: ResponseDescription;

  beforeEach(async(): Promise<void> => {
    metadataWriter = new StaticAsyncHandler(true, undefined);
    writer = new BasicResponseWriter(metadataWriter);
    response = createResponse({ eventEmitter: EventEmitter });
    result = { statusCode: 201 };
  });

  it('requires the input to be a binary ResponseDescription.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata(INTERNAL_QUADS);
    await expect(writer.canHandle({ response, result: { statusCode: 201, metadata }}))
      .rejects.toThrow(NotImplementedHttpError);
    metadata.contentType = 'text/turtle';
    await expect(writer.canHandle({ response, result: { statusCode: 201, metadata }}))
      .resolves.toBeUndefined();
    await expect(writer.canHandle({ response, result: { statusCode: 201 }}))
      .resolves.toBeUndefined();
  });

  it('responds with the status code of the ResponseDescription.', async(): Promise<void> => {
    await writer.handle({ response, result });
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getStatusCode()).toBe(201);
  });

  it('responds with a body if the description has a body.', async(): Promise<void> => {
    const data = guardedStreamFrom([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]);
    result = { statusCode: 201, data };

    const end = new Promise<void>((resolve): void => {
      response.on('end', (): void => {
        expect(response._isEndCalled()).toBeTruthy();
        expect(response._getStatusCode()).toBe(201);
        expect(response._getData()).toBe('<http://test.com/s> <http://test.com/p> <http://test.com/o>.');
        resolve();
      });
    });

    await writer.handle({ response, result });
    await end;
  });

  it('serializes metadata if there is metadata.', async(): Promise<void> => {
    result = { statusCode: 201, metadata: new RepresentationMetadata() };
    jest.spyOn(metadataWriter, 'handle').mockImplementation();
    await writer.handle({ response, result });
    expect(metadataWriter.handle).toHaveBeenCalledTimes(1);
    expect(metadataWriter.handle).toHaveBeenLastCalledWith({ response, metadata: result.metadata });
    expect(response._isEndCalled()).toBeTruthy();
    expect(response._getStatusCode()).toBe(201);
  });

  it('can handle the data stream erroring.', async(): Promise<void> => {
    const data = guardedStreamFrom([]);
    data.read = (): any => {
      data.emit('error', new Error('bad data!'));
      return null;
    };
    result = { statusCode: 201, data };

    response = new PassThrough();
    // eslint-disable-next-line jest/prefer-spy-on
    response.writeHead = jest.fn();

    const end = new Promise<void>((resolve): void => {
      response.on('error', (error: Error): void => {
        expect(error).toEqual(new Error('bad data!'));
        resolve();
      });
    });

    await expect(writer.handle({ response, result })).resolves.toBeUndefined();
    await end;
  });
});
