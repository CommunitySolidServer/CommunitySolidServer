import { createResponse } from 'node-mocks-http';
import { ConstantMetadataWriter } from '../../../../../src/http/output/metadata/ConstantMetadataWriter';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';

describe('A ConstantMetadataWriter', (): void => {
  const writer = new ConstantMetadataWriter({ 'custom-Header': 'X', other: 'Y' });

  it('adds new headers.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;

    await expect(writer.handle({ response })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({ 'custom-header': 'X', other: 'Y' });
  });

  it('extends existing headers.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    response.setHeader('Other', 'A');

    await expect(writer.handle({ response })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({ 'custom-header': 'X', other: [ 'A', 'Y' ]});
  });
});
