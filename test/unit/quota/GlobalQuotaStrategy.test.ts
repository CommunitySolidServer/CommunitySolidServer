import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { GlobalQuotaStrategy } from '../../../src/storage/quota/GlobalQuotaStrategy';
import type { Size } from '../../../src/storage/size-reporter/Size';
import type { SizeReporter } from '../../../src/storage/size-reporter/SizeReporter';
import { guardedStreamFrom, pipeSafely } from '../../../src/util/StreamUtil';

describe('GlobalQuotaStrategy', (): void => {
  let strategy: GlobalQuotaStrategy;
  let mockSize: Size;
  let mockReporter: jest.Mocked<SizeReporter>;
  let mockBase: string;

  beforeEach((): void => {
    mockSize = { amount: 2000, unit: 'bytes' };
    mockBase = '';
    mockReporter = {
      getSize: jest.fn(async(identifier: ResourceIdentifier): Promise<Size> => ({
        unit: mockSize.unit,
        // This mock will return 1000 as size of the root and 50 for any other resource
        amount: identifier.path === mockBase ? 1000 : 50,
      })),
      getUnit: jest.fn().mockReturnValue(mockSize.unit),
      calculateChunkSize: jest.fn(async(chunk: any): Promise<number> => chunk.length),
    };
    strategy = new GlobalQuotaStrategy(mockSize, mockReporter, mockBase);
  });

  describe('constructor()', (): void => {
    it('should set the passed parameters as properties.', async(): Promise<void> => {
      expect(strategy.limit).toEqual(mockSize);
    });
  });

  describe('getAvailableSpace()', (): void => {
    it('should return the correct amount of available space left.', async(): Promise<void> => {
      const result = strategy.getAvailableSpace({ path: 'any/path' });
      await expect(result).resolves.toEqual(
        expect.objectContaining({ amount: mockSize.amount - 950 }),
      );
    });
  });

  describe('estimateSize()', (): void => {
    it('should return a Size object containing the content-length as amount.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata();
      metadata.contentLength = 100;
      await expect(strategy.estimateSize(metadata)).resolves.toEqual(
        expect.objectContaining({ amount: 100 }),
      );
    });

    it(
      'should return a Size object containing 0 as amount if no content-length is present in the metadata.',
      async(): Promise<void> => {
        const metadata = new RepresentationMetadata();
        await expect(strategy.estimateSize(metadata)).resolves.toEqual(
          expect.objectContaining({ amount: 0 }),
        );
      },
    );

    it('should return a Size object containing the correct unit.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata();
      await expect(strategy.estimateSize(metadata)).resolves.toEqual(
        expect.objectContaining({ unit: mockSize.unit }),
      );
    });
  });

  describe('trackAvailableSpace()', (): void => {
    it('should return a passthrough that destroys the stream when quota is exceeded.', async(): Promise<void> => {
      const fiftyChars = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const stream = guardedStreamFrom(fiftyChars);
      const track = await strategy.trackAvailableSpace({ path: 'any/path' });
      const piped = pipeSafely(stream, track);

      for (let i = 0; i < 10; i++) {
        stream.push(fiftyChars);
      }

      expect(piped.destroyed).toBe(false);

      for (let i = 0; i < 10; i++) {
        stream.push(fiftyChars);
      }

      expect(piped.destroyed).toBe(false);

      stream.push(fiftyChars);

      const destroy = new Promise<void>((resolve): void => {
        piped.on('error', (): void => resolve());
      });
      await expect(destroy).resolves.toBeUndefined();
    });
  });
});
