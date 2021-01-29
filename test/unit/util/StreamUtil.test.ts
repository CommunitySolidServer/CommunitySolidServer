import { PassThrough } from 'stream';
import arrayifyStream from 'arrayify-stream';
import streamifyArray from 'streamify-array';
import { guardedStreamFrom, pipeSafely, transformSafely, readableToString } from '../../../src/util/StreamUtil';

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
      await expect(readableToString(piped)).rejects.toThrow('error');
    });

    it('supports mapping errors to something else.', async(): Promise<void> => {
      const input = streamifyArray([ 'data' ]);
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafely(input, output, (): any => new Error('other error'));
      await expect(readableToString(piped)).rejects.toThrow('other error');
    });

    it('destroys the source stream in case the destinations becomes unpiped.', async(): Promise<void> => {
      const input = new PassThrough();
      const output = new PassThrough();
      const piped = pipeSafely(input, output);

      // Catch errors to prevent problems in test output
      output.on('error', (): void => {
        // Empty
      });

      piped.destroy(new Error('this causes an unpipe!'));
      // Allow events to propagate
      await new Promise(setImmediate);
      expect(input.destroyed).toBe(true);
    });
  });

  describe('#transformSafely', (): void => {
    it('can transform a stream without arguments.', async(): Promise<void> => {
      const source = streamifyArray([ 'data' ]);
      const transformed = transformSafely(source);
      transformed.setEncoding('utf8');
      const result = await arrayifyStream(transformed);
      expect(result).toEqual([ 'data' ]);
    });

    it('can transform a stream synchronously.', async(): Promise<void> => {
      const source = streamifyArray([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        encoding: 'utf8',
        transform(data: string): void {
          this.push(`${data}1`);
          this.push(`${data}2`);
        },
        flush(): void {
          this.push(`data3`);
        },
      });
      const result = await arrayifyStream(transformed);
      expect(result).toEqual([ 'data1', 'data2', 'data3' ]);
    });

    it('can transform a stream asynchronously.', async(): Promise<void> => {
      const source = streamifyArray([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        encoding: 'utf8',
        async transform(data: string): Promise<void> {
          await new Promise((resolve): any => setImmediate(resolve));
          this.push(`${data}1`);
          this.push(`${data}2`);
        },
        async flush(): Promise<void> {
          await new Promise((resolve): any => setImmediate(resolve));
          this.push(`data3`);
        },
      });
      const result = await arrayifyStream(transformed);
      expect(result).toEqual([ 'data1', 'data2', 'data3' ]);
    });

    it('catches source errors.', async(): Promise<void> => {
      const error = new Error('stream error');
      const source = new PassThrough();
      const transformed = transformSafely<string>(source);
      source.emit('error', error);
      await expect(arrayifyStream(transformed)).rejects.toThrow(error);
    });

    it('catches synchronous errors on transform.', async(): Promise<void> => {
      const error = new Error('stream error');
      const source = streamifyArray([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        transform(): never {
          throw error;
        },
      });
      await expect(arrayifyStream(transformed)).rejects.toThrow(error);
    });

    it('catches synchronous errors on flush.', async(): Promise<void> => {
      const error = new Error('stream error');
      const source = streamifyArray([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        async flush(): Promise<never> {
          await new Promise((resolve): any => setImmediate(resolve));
          throw error;
        },
      });
      await expect(arrayifyStream(transformed)).rejects.toThrow(error);
    });

    it('catches asynchronous errors on transform.', async(): Promise<void> => {
      const error = new Error('stream error');
      const source = streamifyArray([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        transform(): never {
          throw error;
        },
      });
      await expect(arrayifyStream(transformed)).rejects.toThrow(error);
    });

    it('catches asynchronous errors on flush.', async(): Promise<void> => {
      const error = new Error('stream error');
      const source = streamifyArray([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        async flush(): Promise<never> {
          await new Promise((resolve): any => setImmediate(resolve));
          throw error;
        },
      });
      await expect(arrayifyStream(transformed)).rejects.toThrow(error);
    });
  });

  describe('#guardedStreamFrom', (): void => {
    it('converts data to a guarded stream.', async(): Promise<void> => {
      const data = [ 'a', 'b' ];
      await expect(readableToString(guardedStreamFrom(data))).resolves.toBe('ab');
    });
  });
});
