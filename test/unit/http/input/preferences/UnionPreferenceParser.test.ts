import type { PreferenceParser } from '../../../../../src/http/input/preferences/PreferenceParser';
import { UnionPreferenceParser } from '../../../../../src/http/input/preferences/UnionPreferenceParser';
import { InternalServerError } from '../../../../../src/util/errors/InternalServerError';

describe('A UnionPreferenceParser', (): void => {
  let parsers: jest.Mocked<PreferenceParser>[];
  let parser: UnionPreferenceParser;

  beforeEach(async(): Promise<void> => {
    parsers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue({}),
      } satisfies Partial<PreferenceParser> as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue({}),
      } satisfies Partial<PreferenceParser> as any,
    ];

    parser = new UnionPreferenceParser(parsers);
  });

  it('combines the outputs.', async(): Promise<void> => {
    parsers[0].handle.mockResolvedValue({
      type: { 'text/turtle': 1 },
      range: { unit: 'bytes', parts: [{ start: 3, end: 5 }]},
    });
    parsers[1].handle.mockResolvedValue({
      type: { 'text/plain': 0.9 },
      language: { nl: 0.8 },
    });

    await expect(parser.handle({} as any)).resolves.toEqual({
      type: { 'text/turtle': 1, 'text/plain': 0.9 },
      language: { nl: 0.8 },
      range: { unit: 'bytes', parts: [{ start: 3, end: 5 }]},
    });
  });

  it('throws an error if multiple parsers return a range.', async(): Promise<void> => {
    parsers[0].handle.mockResolvedValue({
      type: { 'text/turtle': 1 },
      range: { unit: 'bytes', parts: [{ start: 3, end: 5 }]},
    });
    parsers[1].handle.mockResolvedValue({
      type: { 'text/plain': 0.9 },
      language: { nl: 0.8 },
      range: { unit: 'bytes', parts: [{ start: 3, end: 5 }]},
    });

    await expect(parser.handle({} as any)).rejects.toThrow(InternalServerError);
  });
});
