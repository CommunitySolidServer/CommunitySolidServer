import { URL } from 'url';
import { BaseHttpClient } from '../../../../src/http/client/BaseHttpClient';

let errorListener: any;
let responseListener: any;
const on = jest.fn(
  (event: string, listener: any): any => {
    if (event === 'error') {
      errorListener = listener;
    } else if (event === 'response') {
      responseListener = listener;
    }
  },
);
const write = jest.fn();
const end = jest.fn();
const request = {
  on,
  write,
  end,
};
jest.mock('http', (): any => ({
  request: (): any => request,
}));
jest.mock('https', (): any => ({
  request: (): any => request,
}));

describe('A base http client', (): void => {
  it('should throw for unsupported protocols.', async(): Promise<void> => {
    const client = new BaseHttpClient();
    const response = client.call('file://path/foo/bar', { method: 'POST', headers: { accept: 'text/plain' }}, 'DATA');
    await expect(response).rejects.toThrow(new Error(`Protocol file: not supported.`));
  });
  it('should throw for unsupported protocols when given as URL.', async(): Promise<void> => {
    const client = new BaseHttpClient();
    const response = client.call(new URL('file://path/foo/bar'), { method: 'POST', headers: { accept: 'text/plain' }}, 'DATA');
    await expect(response).rejects.toThrow(new Error(`Protocol file: not supported.`));
  });
  it('can errors on bad requests.', async(): Promise<void> => {
    const client = new BaseHttpClient();
    end.mockImplementationOnce((): any => {
      errorListener({ message: 'error' });
      return { statusCode: 400 };
    });
    const promise = client.call('http://server/foo/bar', { method: 'POST', headers: { accept: 'text/plain' }}, 'DATA');
    await expect(promise).rejects.toThrow(new Error(`Fetch error: error`));
  });
  it('can send http requests.', async(): Promise<void> => {
    const client = new BaseHttpClient();
    end.mockImplementationOnce((): any => {
      responseListener({ statusCode: 200 });
    });
    const promise = client.call('http://server/foo/bar', { method: 'POST', headers: { accept: 'text/plain' }}, 'DATA');
    await expect(promise).resolves.toStrictEqual({ statusCode: 200 });
  });
  it('can send https requests.', async(): Promise<void> => {
    const client = new BaseHttpClient();
    end.mockImplementationOnce((): any => {
      responseListener({ statusCode: 200 });
    });
    const promise = client.call('https://server/foo/bar', { method: 'POST', headers: { accept: 'text/plain' }}, 'DATA');
    await expect(promise).resolves.toStrictEqual({ statusCode: 200 });
  });
});
