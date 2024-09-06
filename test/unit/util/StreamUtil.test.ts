import { PassThrough, Readable } from 'node:stream';
import arrayifyStream from 'arrayify-stream';
import { BlankNode, Literal, NamedNode, Quad, Store } from 'n3';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import { isHttpRequest } from '../../../src/server/HttpRequest';
import {
  getSingleItem,
  guardedStreamFrom,
  pipeSafely,
  readableToQuads,
  readableToString,
  readJsonStream,
  transformSafely,
} from '../../../src/util/StreamUtil';
import { flushPromises } from '../../util/Util';

jest.mock('../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { warn: jest.fn(), log: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});
const logger: jest.Mocked<Logger> = getLoggerFor('StreamUtil') as any;

jest.mock('../../../src/server/HttpRequest', (): any => ({
  isHttpRequest: jest.fn(),
}));

describe('StreamUtil', (): void => {
  describe('#readableToString', (): void => {
    it('concatenates all elements of a Readable.', async(): Promise<void> => {
      const stream = Readable.from([ 'a', 'b', 'c' ]);
      await expect(readableToString(stream)).resolves.toBe('abc');
    });
  });

  describe('#readableToQuads', (): void => {
    it('imports all quads from a Readable.', async(): Promise<void> => {
      const subject = new NamedNode('#subject');
      const property = new NamedNode('#property');
      const object = new NamedNode('#object');
      const literal = new Literal('abcde');
      const blankNode = new BlankNode('_1');
      const graph = new NamedNode('#graph');

      const quad1 = new Quad(subject, property, object, graph);
      const quad2 = new Quad(subject, property, literal, graph);
      const quad3 = new Quad(subject, property, blankNode, graph);
      const quads = new Store();
      quads.add(quad1);
      quads.add(quad2);
      quads.add(quad3);

      const stream = Readable.from([ quad1, quad2, quad3 ]);
      await expect(readableToQuads(stream)).resolves.toEqual(quads);
    });
  });

  describe('#readJsonStream', (): void => {
    it('parses the stream as JSON.', async(): Promise<void> => {
      const stream = Readable.from('{ "key": "value" }');
      await expect(readJsonStream(stream)).resolves.toEqual({ key: 'value' });
    });
  });

  describe('#getSingleItem', (): void => {
    it('extracts a single item from the stream.', async(): Promise<void> => {
      const stream = Readable.from([ 5 ]);
      await expect(getSingleItem(stream)).resolves.toBe(5);
    });

    it('errors if there are multiple items.', async(): Promise<void> => {
      const stream = Readable.from([ 5, 5 ]);
      await expect(getSingleItem(stream)).rejects.toThrow('Expected a stream with a single object.');
    });
  });

  describe('#pipeSafely', (): void => {
    beforeEach(async(): Promise<void> => {
      jest.clearAllMocks();
    });

    it('pipes data from one stream to the other.', async(): Promise<void> => {
      const input = Readable.from([ 'data' ]);
      const output = new PassThrough();
      const piped = pipeSafely(input, output);
      await expect(readableToString(piped)).resolves.toBe('data');
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
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenLastCalledWith('warn', 'Piped stream errored with error');
    });

    it('supports mapping errors to something else.', async(): Promise<void> => {
      const input = Readable.from([ 'data' ]);
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafely(input, output, (): any => new Error('other error'));
      await expect(readableToString(piped)).rejects.toThrow('other error');
    });

    it('logs specific safer errors as debug.', async(): Promise<void> => {
      const input = Readable.from([ 'data' ]);
      input.read = (): any => {
        input.emit('error', new Error('Cannot call write after a stream was destroyed'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafely(input, output);
      await expect(readableToString(piped)).rejects.toThrow('Cannot call write after a stream was destroyed');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenLastCalledWith(
        'debug',
        'Piped stream errored with Cannot call write after a stream was destroyed',
      );
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
      await flushPromises();
      expect(input.destroyed).toBe(true);
    });

    it('does not destroy the source stream if it is an HttpRequest.', async(): Promise<void> => {
      jest.mocked(isHttpRequest).mockReturnValueOnce(true);
      const input = new PassThrough();
      const output = new PassThrough();
      const piped = pipeSafely(input, output);

      // Catch errors to prevent problems in test output
      output.on('error', (): void => {
        // Empty
      });

      piped.destroy(new Error('error!'));
      // Allow events to propagate
      await flushPromises();
      expect(input.destroyed).toBe(false);
    });

    it('still sends errors downstream if the input is an HttpRequest.', async(): Promise<void> => {
      jest.mocked(isHttpRequest).mockReturnValueOnce(true);
      const input = new PassThrough();
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafely(input, output);
      await expect(readableToString(piped)).rejects.toThrow('error');
    });

    it('can map errors if the input is an HttpRequest.', async(): Promise<void> => {
      jest.mocked(isHttpRequest).mockReturnValueOnce(true);
      const input = Readable.from([ 'data' ]);
      input.read = (): any => {
        input.emit('error', new Error('error'));
        return null;
      };
      const output = new PassThrough();
      const piped = pipeSafely(input, output, (): any => new Error('other error'));
      await expect(readableToString(piped)).rejects.toThrow('other error');
    });
  });

  describe('#transformSafely', (): void => {
    it('can transform a stream without arguments.', async(): Promise<void> => {
      const source = Readable.from([ 'data' ]);
      const transformed = transformSafely(source);
      transformed.setEncoding('utf8');
      const result = await arrayifyStream(transformed);
      expect(result).toEqual([ 'data' ]);
    });

    it('can transform a stream synchronously.', async(): Promise<void> => {
      const source = Readable.from([ 'data' ]);
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
      const source = Readable.from([ 'data' ]);
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
      const source = Readable.from([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        transform(): never {
          throw error;
        },
      });
      await expect(arrayifyStream(transformed)).rejects.toThrow(error);
    });

    it('catches synchronous errors on flush.', async(): Promise<void> => {
      const error = new Error('stream error');
      const source = Readable.from([ 'data' ]);
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
      const source = Readable.from([ 'data' ]);
      const transformed = transformSafely<string>(source, {
        transform(): never {
          throw error;
        },
      });
      await expect(arrayifyStream(transformed)).rejects.toThrow(error);
    });

    it('catches asynchronous errors on flush.', async(): Promise<void> => {
      const error = new Error('stream error');
      const source = Readable.from([ 'data' ]);
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
      await expect(readableToString(guardedStreamFrom([ 'a', 'b' ]))).resolves.toBe('ab');
      await expect(readableToString(guardedStreamFrom('ab'))).resolves.toBe('ab');
    });
  });
});
