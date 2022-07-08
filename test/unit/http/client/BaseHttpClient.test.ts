import { URL } from 'url';
import { BaseHttpClient } from '../../../../src/http/client/BaseHttpClient';

let errorListener: any;
let responseListener: any;
const mockRequest = {
  on: jest.fn((event: string, listener: any): any => {
    switch (event) {
      case 'error': return errorListener = listener;
      case 'response': return responseListener = listener;
      default:
    }
  }),
  write: jest.fn(),
  end: jest.fn(() => responseListener({ statusCode: 200 })),
};

jest.mock('http', (): any => ({ request: (): any => mockRequest }));
jest.mock('https', (): any => ({ request: (): any => mockRequest }));

describe('A BaseHttpClient', (): void => {
  let client: BaseHttpClient;

  beforeEach(() => {
    client = new BaseHttpClient();
  });

  it('should throw when url contains an unsupported protocol.', async(): Promise<void> => {
    const response = client.call('file://example.com', {}, '');
    await expect(response).rejects.toThrow(new Error(`Protocol file: not supported.`));
  });

  it('should accept string and URL as type of the first parameter.', async(): Promise<void> => {
    const stringResponse = client.call('http://example.com', {}, '');
    await expect(stringResponse).resolves.toBeDefined();
    const urlResponse = client.call(new URL('http://example.com'), {}, '');
    await expect(urlResponse).resolves.toBeDefined();
  });

  it('should throw on error.', async(): Promise<void> => {
    mockRequest.end.mockImplementationOnce((): any => {
      errorListener({ message: 'error' });
    });
    const response = client.call('http://example.com', {}, '');
    await expect(response).rejects.toThrow(new Error(`Fetch error: error`));
  });

  it('should send http requests.', async(): Promise<void> => {
    const response = client.call('http://example.com', {}, '');
    await expect(response).resolves.toMatchObject({ statusCode: 200 });
  });
  it('should send https requests.', async(): Promise<void> => {
    const response = client.call('https://example.com', {}, '');
    await expect(response).resolves.toMatchObject({ statusCode: 200 });
  });
});