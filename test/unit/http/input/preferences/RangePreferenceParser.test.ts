import { RangePreferenceParser } from '../../../../../src/http/input/preferences/RangePreferenceParser';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';

describe('A RangePreferenceParser', (): void => {
  const parser = new RangePreferenceParser();

  it('parses range headers.', async(): Promise<void> => {
    await expect(parser.handle({ request: { headers: { range: 'bytes=5-10' }}} as any))
      .resolves.toEqual({ range: { unit: 'bytes', parts: [{ start: 5, end: 10 }]}});

    await expect(parser.handle({ request: { headers: { range: 'bytes=5-' }}} as any))
      .resolves.toEqual({ range: { unit: 'bytes', parts: [{ start: 5 }]}});

    await expect(parser.handle({ request: { headers: { range: 'bytes=-5' }}} as any))
      .resolves.toEqual({ range: { unit: 'bytes', parts: [{ start: -5 }]}});

    await expect(parser.handle({ request: { headers: { range: 'bytes=5-10, 11-20, 21-99' }}} as any))
      .resolves.toEqual({ range: {
        unit: 'bytes',
        parts: [{ start: 5, end: 10 }, { start: 11, end: 20 }, { start: 21, end: 99 }],
      }});
  });

  it('returns an empty object if there is no header.', async(): Promise<void> => {
    await expect(parser.handle({ request: { headers: {}}} as any)).resolves.toEqual({});
  });

  it('rejects invalid range headers.', async(): Promise<void> => {
    await expect(parser.handle({ request: { headers: { range: '=5-10' }}} as any))
      .rejects.toThrow(BadRequestHttpError);
    await expect(parser.handle({ request: { headers: { range: 'bytes' }}} as any))
      .rejects.toThrow(BadRequestHttpError);
    await expect(parser.handle({ request: { headers: { range: 'bytes=' }}} as any))
      .rejects.toThrow(BadRequestHttpError);
    await expect(parser.handle({ request: { headers: { range: 'bytes=-' }}} as any))
      .rejects.toThrow(BadRequestHttpError);
    await expect(parser.handle({ request: { headers: { range: 'bytes=5' }}} as any))
      .rejects.toThrow(BadRequestHttpError);
    await expect(parser.handle({ request: { headers: { range: 'bytes=5-10, 99' }}} as any))
      .rejects.toThrow(BadRequestHttpError);
  });
});
