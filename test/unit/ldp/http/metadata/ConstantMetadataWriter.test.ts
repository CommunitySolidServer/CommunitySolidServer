import { createResponse } from 'node-mocks-http';
import { ConstantMetadataWriter } from '../../../../../src/ldp/http/metadata/ConstantMetadataWriter';

describe('A ConstantMetadataWriter', (): void => {
  const writer = new ConstantMetadataWriter({ 'custom-Header': 'X', other: 'Y' });

  it('adds new headers.', async(): Promise<void> => {
    const response = createResponse();

    await expect(writer.handle({ response })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({ 'custom-header': 'X', other: 'Y' });
  });

  it('extends existing headers.', async(): Promise<void> => {
    const response = createResponse();
    response.setHeader('Other', 'A');

    await expect(writer.handle({ response })).resolves.toBeUndefined();

    expect(response.getHeaders()).toEqual({ 'custom-header': 'X', other: [ 'A', 'Y' ]});
  });
});
