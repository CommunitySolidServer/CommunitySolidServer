import type { Readable } from 'stream';
import { PassThrough } from 'stream';
import type { ValidatorArgs } from '../../../../src/http/auxiliary/Validator';
import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { QuotaStrategy } from '../../../../src/storage/quota/QuotaStrategy';
import type { Size } from '../../../../src/storage/size-reporter/Size';
import { QuotaValidator } from '../../../../src/storage/validators/QuotaValidator';
import { guardStream } from '../../../../src/util/GuardedStream';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { guardedStreamFrom, readableToString } from '../../../../src/util/StreamUtil';

describe('QuotaValidator', (): void => {
  let mockedStrategy: QuotaStrategy;
  let validator: QuotaValidator;
  let identifier: ResourceIdentifier;
  let mockMetadata: RepresentationMetadata;
  let mockData: Guarded<Readable>;
  let mockInput: ValidatorArgs;

  beforeEach((): void => {
    jest.clearAllMocks();
    identifier = { path: 'http://localhost/' };
    mockMetadata = new RepresentationMetadata();
    mockData = guardedStreamFrom([ 'test string' ]);
    mockInput = {
      representation: new BasicRepresentation(mockData, mockMetadata),
      identifier,
    };
    mockedStrategy = {
      getAvailableSpace: async(): Promise<Size> => ({ unit: 'bytes', amount: 10 }),
      estimateSize: async(): Promise<Size> => ({ unit: 'bytes', amount: 8 }),
      trackAvailableSpace: async(): Promise<Guarded<PassThrough>> => guardStream(new PassThrough()),
    };
    validator = new QuotaValidator(mockedStrategy);
  });

  describe('constructor()', (): void => {
    it('should set the strategy parameter.', async(): Promise<void> => {
      expect((validator as any).strategy).toEqual(mockedStrategy);
    });
  });

  describe('handle()', (): void => {
    // Step 2
    it('should destroy the stream when estimated size is larger than the available size.', async(): Promise<void> => {
      mockedStrategy.estimateSize = jest.fn().mockReturnValueOnce({ unit: 'bytes', amount: 11 });

      const result = validator.handle(mockInput);
      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;

      const prom = new Promise<void>((resolve, reject): void => {
        awaitedResult.data.on('error', (): void => resolve());
        awaitedResult.data.on('end', (): void => reject(new Error('reject')));
      });

      // Consume the stream
      await expect(readableToString(awaitedResult.data))
        .rejects.toThrow('Quota exceeded: Advertised Content-Length is');
      await expect(prom).resolves.toBeUndefined();
    });

    // Step 3
    it('should destroy the stream when quota is exceeded during write.', async(): Promise<void> => {
      const trackAvailableSpaceSpy = jest.spyOn(mockedStrategy, 'trackAvailableSpace')
        .mockImplementationOnce(async(): Promise<Guarded<PassThrough>> => guardStream(new PassThrough({
          async transform(this): Promise<void> {
            this.destroy();
          },
        })));

      const result = validator.handle(mockInput);
      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;

      const prom = new Promise<void>((resolve, reject): void => {
        awaitedResult.data.on('error', (): void => resolve());
        awaitedResult.data.on('end', (): void => reject(new Error('reject')));
      });

      // Consume the stream
      await expect(readableToString(awaitedResult.data)).rejects.toThrow();
      expect(trackAvailableSpaceSpy).toHaveBeenCalledTimes(1);
      await expect(prom).resolves.toBeUndefined();
    });

    // Step 4
    it('should throw when quota were exceeded after stream was finished.', async(): Promise<void> => {
      const result = validator.handle(mockInput);

      // Putting this after the handle / before consuming the stream will only effect
      // this function in the flush part of the code.
      mockedStrategy.getAvailableSpace = jest.fn().mockImplementationOnce((): Size =>
        ({ unit: 'bytes', amount: -100 }));

      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;

      const prom = new Promise<void>((resolve, reject): void => {
        awaitedResult.data.on('error', (): void => resolve());
        awaitedResult.data.on('end', (): void => reject(new Error('reject')));
      });

      // Consume the stream
      await expect(readableToString(awaitedResult.data)).rejects.toThrow('Quota exceeded after write completed');
      await expect(prom).resolves.toBeUndefined();
    });

    it('should return a stream that is consumable without error if quota isn\'t exceeded.', async(): Promise<void> => {
      const result = validator.handle(mockInput);
      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;
      await expect(readableToString(awaitedResult.data)).resolves.toBe('test string');
    });
  });
});
