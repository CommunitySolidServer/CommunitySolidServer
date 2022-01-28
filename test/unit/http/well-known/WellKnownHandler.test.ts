/* eslint-disable @typescript-eslint/no-empty-function */
import type { ServerResponse } from 'http';
import type { WellKnownBuilder } from '../../../../src/http/well-known/WellKnownBuilder';
import { WellKnownHandler } from '../../../../src/http/well-known/WellKnownHandler';
import type { HttpRequest } from '../../../../src/server/HttpRequest';

describe('A WellKnownHandler', (): void => {
  it('should write expected data to the response.', async(): Promise<void> => {
    const builder: WellKnownBuilder = {
      getWellKnownSegment: jest.fn((): Promise<Record<string, any>> => Promise.resolve({ builder: 'segment' })),
    };
    const wellKnownHandler = new WellKnownHandler(builder);
    const request = {
    } as unknown as HttpRequest;

    const response = {
      setHeader: jest.fn((): any => {}),
      write: jest.fn((): any => {}),
      end: jest.fn((): any => {}),
    } as unknown as ServerResponse;

    const setHeaderSpy = jest.spyOn(response, 'setHeader');

    const promise = wellKnownHandler.handle({ request, response });
    await expect(promise).resolves.not.toThrow();
    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(setHeaderSpy.mock.calls).toEqual([[ 'Content-Type', 'application/ld+json' ]]);
    expect(response.write).toHaveBeenCalledTimes(1);
    expect(response.write).toHaveBeenCalledWith('{"builder":"segment"}');
    expect(response.end).toHaveBeenCalledTimes(1);
  });
});
