import { Readable } from 'stream';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { QuotaStrategy } from '../../../../src/storage/quota-strategy/QuotaStrategy';
import type { Size } from '../../../../src/storage/size-reporter/size.model';
import { QuotaDataValidator } from '../../../../src/storage/validators/QuotaDataValidator';
import { guardStream } from '../../../../src/util/GuardedStream';
import type { Guarded } from '../../../../src/util/GuardedStream';
import { guardedStreamFrom, readableToString } from '../../../../src/util/StreamUtil';

describe('QuotaDataValidator', (): void => {
  const mockedStrategy: QuotaStrategy = {
    getAvailableSpace: (): Size => ({ unit: 'bytes', amount: 10 }),
    estimateSize: (): Size => ({ unit: 'bytes', amount: 8 }),
    trackAvailableSpace(identifier, data): Guarded<Readable> {
      const newStream = guardedStreamFrom('');
      data.on('data', (): void => {
        newStream.push(1);
      });
      return newStream;
    },
  };

  let validator: QuotaDataValidator;
  const identifier = { path: 'http://localhost/' };
  const mockMetadata = new RepresentationMetadata();
  let mockData: Guarded<Readable>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockData = guardedStreamFrom([ 'test string' ]);
    validator = new QuotaDataValidator(mockedStrategy);
  });

  describe('constructor()', (): void => {
    it('should set the strategy parameter.', async(): Promise<void> => {
      expect((validator as any).strategy).toEqual(mockedStrategy);
    });
  });

  describe('validateRepresentation()', (): void => {
    it('should destroy the when the estimated size is larger than the available size.', async(): Promise<void> => {
      const spy = jest.spyOn(mockData, 'destroy');
      const trackAvailableSpaceSpy = jest.spyOn(mockedStrategy, 'trackAvailableSpace');
      mockedStrategy.estimateSize = jest.fn().mockReturnValueOnce({ unit: 'bytes', amount: 11 });

      const result = validator.validateRepresentation(identifier, mockData, mockMetadata);

      await expect(result).resolves.toBeDefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(trackAvailableSpaceSpy).toHaveBeenCalledTimes(0);
    });
    it('should destroy the data stream when quota is exceeded during write.', async(): Promise<void> => {
      const destroySpy = jest.spyOn(mockData, 'destroy');
      const trackAvailableSpaceSpy = jest.spyOn(mockedStrategy, 'trackAvailableSpace')
        .mockImplementationOnce((identifier, data): Guarded<Readable> => {
          const newStream = guardedStreamFrom('');
          data.on('data', (): void => {
            newStream.push(-1);
          });
          return newStream;
        });

      const result = validator.validateRepresentation(identifier, mockData, mockMetadata);

      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;

      await expect(readableToString(awaitedResult)).resolves.toBe('test string');
      expect(trackAvailableSpaceSpy).toHaveBeenCalledTimes(1);
      expect(destroySpy).toHaveBeenCalled();
    });
    it('should throw when quota were exceeded after stream was finished.', async(): Promise<void> => {
      const result = validator.validateRepresentation(identifier, mockData, mockMetadata);

      mockedStrategy.getAvailableSpace = jest.fn().mockImplementation((): Size =>
        ({ unit: 'bytes', amount: -100 }));

      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;

      const prom = new Promise<string>((resolveP, reject): void => {
        awaitedResult.on('error', (): void => {
          resolveP('not undefined');
        });
        awaitedResult.on('end', (): void => {
          reject(new Error('Reject'));
        });
      });

      await expect(readableToString(awaitedResult)).rejects.toThrow('Quota exceeded after write completed');

      await expect(prom).resolves.toBeDefined();
    });
    it('should return the desired Guarded<Readable> returned by the pipe.', async(): Promise<void> => {
      const result = validator.validateRepresentation(identifier, mockData, mockMetadata);
      await expect(result).resolves.toBeDefined();
      const awaitedResult = await result;
    });
  });
});
