import type { ServerResponse } from 'http';
import { WellKnownHandler } from '../../../../src/http/well-known/WellKnownHandler';
import type { HttpRequest } from '../../../../src/server/HttpRequest';

describe('A WellKnownHandler', (): void => {
  it('should write expected data to the response.', async(): Promise<void> => {
    const mockResponseBody = { builder: 'segment' };
    const wellKnownHandler = new WellKnownHandler(
      { getWellKnownSegment: jest.fn().mockResolvedValue(mockResponseBody) },
    );
    const request = {} as unknown as HttpRequest;

    const response = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as ServerResponse;

    const result = wellKnownHandler.handle({ request, response });
    await expect(result).resolves.toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/ld+json');
    expect(response.write).toHaveBeenCalledTimes(1);
    expect(response.write).toHaveBeenCalledWith(JSON.stringify(mockResponseBody));
    expect(response.end).toHaveBeenCalledTimes(1);
  });
});
