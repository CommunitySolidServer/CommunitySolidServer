import { PassThrough } from 'stream';
import streamifyArray from 'streamify-array';
import { pipeSafely, readableToString } from '../../../src/util/StreamUtil';

describe('StreamUtil', (): void => {
  describe('#readableToString', (): void => {
    it('concatenates all elements of a Readable.', async(): Promise<void> => {
      const stream = streamifyArray([ 'a', 'b', 'c' ]);
      await expect(readableToString(stream)).resolves.toEqual('abc');
    });
  });

  describe('#pipeSafely', (): void => {
    it('pipes data from one stream to the other.', async(): Promise<void> => {
      const input = streamifyArray([ 'data' ]);
      const output = new PassThrough();
      const piped = pipeSafely(input, output);
      await expect(readableToString(piped)).resolves.toEqual('data');
    });

    it('pipes errors from one stream to the other.', async(): Promise<void> => {
      const input = new PassThrough();
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafely(input, output);
      await expect(readableToString(piped)).rejects.toThrow(new Error('error'));
    });

    it('supports mapping errors to something else.', async(): Promise<void> => {
      const input = streamifyArray([ 'data' ]);
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafely(input, output, (): any => new Error('other error'));
      await expect(readableToString(piped)).rejects.toThrow(new Error('other error'));
    });
  });
});
