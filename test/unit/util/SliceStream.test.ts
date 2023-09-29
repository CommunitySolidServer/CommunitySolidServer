import { Readable } from 'stream';
import { RangeNotSatisfiedHttpError } from '../../../src/util/errors/RangeNotSatisfiedHttpError';
import { SliceStream } from '../../../src/util/SliceStream';
import { readableToString } from '../../../src/util/StreamUtil';

describe('A SliceStream', (): void => {
  it('does not support suffix slicing.', async(): Promise<void> => {
    expect((): unknown => new SliceStream(Readable.from('0123456789'), { start: -5 }))
      .toThrow(RangeNotSatisfiedHttpError);
  });

  it('requires the end to be more than the start.', async(): Promise<void> => {
    expect((): unknown => new SliceStream(Readable.from('0123456789'), { start: 5, end: 4 }))
      .toThrow(RangeNotSatisfiedHttpError);
    expect((): unknown => new SliceStream(Readable.from('0123456789'), { start: 5, end: 5 }))
      .toThrow(RangeNotSatisfiedHttpError);
  });

  it('can slice binary streams.', async(): Promise<void> => {
    await expect(readableToString(new SliceStream(Readable.from('0123456789', { objectMode: false }),
      { start: 3, end: 7, objectMode: false }))).resolves.toBe('34567');

    await expect(readableToString(new SliceStream(Readable.from('0123456789', { objectMode: false }),
      { start: 3, objectMode: false }))).resolves.toBe('3456789');

    await expect(readableToString(new SliceStream(Readable.from('0123456789', { objectMode: false }),
      { start: 3, end: 20, objectMode: false }))).resolves.toBe('3456789');
  });

  it('can slice object streams.', async(): Promise<void> => {
    const arr = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ];
    await expect(readableToString(new SliceStream(Readable.from(arr, { objectMode: true }),
      { start: 3, end: 7, objectMode: true }))).resolves.toBe('34567');

    await expect(readableToString(new SliceStream(Readable.from(arr, { objectMode: true }),
      { start: 3, objectMode: true }))).resolves.toBe('3456789');

    await expect(readableToString(new SliceStream(Readable.from(arr, { objectMode: true }),
      { start: 3, end: 20, objectMode: true }))).resolves.toBe('3456789');
  });
});
