import { createResponse } from 'node-mocks-http';
import type { HttpResponse } from '../../../../src/server/HttpResponse';
import { WebSocketAdvertiser } from '../../../../src/server/middleware/WebSocketAdvertiser';

describe('A WebSocketAdvertiser', (): void => {
  it('writes a ws: socket when given an http: URL.', async(): Promise<void> => {
    const writer = new WebSocketAdvertiser('http://test.example/');
    const response = createResponse() as HttpResponse;
    await writer.handle({ response } as any);
    expect(response.getHeaders()).toEqual({ 'updates-via': 'ws://test.example/' });
  });

  it('writes a ws: socket when given a ws: URL.', async(): Promise<void> => {
    const writer = new WebSocketAdvertiser('ws://test.example/');
    const response = createResponse() as HttpResponse;
    await writer.handle({ response } as any);
    expect(response.getHeaders()).toEqual({ 'updates-via': 'ws://test.example/' });
  });

  it('writes a wss: socket when given an https: URL.', async(): Promise<void> => {
    const writer = new WebSocketAdvertiser('https://test.example/');
    const response = createResponse() as HttpResponse;
    await writer.handle({ response } as any);
    expect(response.getHeaders()).toEqual({ 'updates-via': 'wss://test.example/' });
  });

  it('writes a wss: socket when given a wss: URL.', async(): Promise<void> => {
    const writer = new WebSocketAdvertiser('wss://test.example/');
    const response = createResponse() as HttpResponse;
    await writer.handle({ response } as any);
    expect(response.getHeaders()).toEqual({ 'updates-via': 'wss://test.example/' });
  });
});
