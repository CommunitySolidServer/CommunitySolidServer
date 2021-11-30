import { Readable } from 'stream';
import type { NotificationWellKnownHttpHandlerArgs } from '../../../src/http/NotificationWellKnownHttpHandler';
import { NotificationWellKnownHttpHandler } from '../../../src/http/NotificationWellKnownHttpHandler';
import { OkResponseDescription } from '../../../src/http/output/response/OkResponseDescription';
import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { guardStream } from '../../../src/util/GuardedStream';

describe('A NotificationWellKnownHttpHandler', (): void => {
  const args: NotificationWellKnownHttpHandlerArgs = {
    baseUrl: 'BASEURL/',
  };
  const handler = new NotificationWellKnownHttpHandler(args);

  it('handles GET requests.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation: { method: 'GET' } as any }))
      .resolves.not.toThrow(NotImplementedHttpError);
  });

  it('disallow POST requests.', async(): Promise<void> => {
    await expect(handler.canHandle({ operation: { method: 'POST' } as any }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('shoud give the expected reply.', async(): Promise<void> => {
    const json = {
      '@context': [ 'https://www.w3.org/ns/solid/notification/v1' ],
      // eslint-disable-next-line @typescript-eslint/naming-convention
      notification_endpoint: `BASEURL/gateway`,
    };
    const representationMetadata = new RepresentationMetadata('application/ld+json');
    const data = guardStream(Readable.from(JSON.stringify(json)));
    const expected = new OkResponseDescription(representationMetadata, data);
    const response = await handler.handle({ operation: { method: 'GET' }} as any);
    const responseJson = response?.data?.read();
    expect(response?.statusCode).toEqual(expected.statusCode);
    expect(response?.metadata).toEqual(expected.metadata);
    expect(responseJson).toEqual(JSON.stringify(json));
  });
});
