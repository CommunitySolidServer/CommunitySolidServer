import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import { QuotaStrategy } from '../../../src/storage/quota/QuotaStrategy';
import { UNIT_BYTES } from '../../../src/storage/size-reporter/Size';
import type { Size } from '../../../src/storage/size-reporter/Size';
import type { SizeReporter } from '../../../src/storage/size-reporter/SizeReporter';
import { guardedStreamFrom, pipeSafely } from '../../../src/util/StreamUtil';
import { mockFileSystem } from '../../util/Util';

jest.mock('node:fs');

class QuotaStrategyWrapper extends QuotaStrategy {
  public constructor(reporter: SizeReporter<any>, limit: Size) {
    super(reporter, limit);
  }

  public getAvailableSpace = async(): Promise<Size> => ({ unit: UNIT_BYTES, amount: 5 });
  protected getTotalSpaceUsed = async(): Promise<Size> => ({ unit: UNIT_BYTES, amount: 5 });
}

describe('A QuotaStrategy', (): void => {
  let strategy: QuotaStrategyWrapper;
  let mockSize: Size;
  let mockReporter: jest.Mocked<SizeReporter<any>>;
  const base = 'http://localhost:3000/';
  const rootFilePath = 'folder';

  beforeEach((): void => {
    jest.restoreAllMocks();
    mockFileSystem(rootFilePath, new Date());
    mockSize = { amount: 2000, unit: UNIT_BYTES };
    mockReporter = {
      getSize: jest.fn().mockResolvedValue({ unit: mockSize.unit, amount: 50 }),
      getUnit: jest.fn().mockReturnValue(mockSize.unit),
      calculateChunkSize: jest.fn(async(chunk: any): Promise<number> => chunk.length),
      estimateSize: jest.fn().mockResolvedValue(5),
    };
    strategy = new QuotaStrategyWrapper(mockReporter, mockSize);
  });

  describe('constructor()', (): void => {
    it('should set the passed parameters as properties.', async(): Promise<void> => {
      expect(strategy.limit).toEqual(mockSize);
      expect(strategy.reporter).toEqual(mockReporter);
    });
  });

  describe('estimateSize()', (): void => {
    it('should return a Size object containing the correct unit and amount.', async(): Promise<void> => {
      await expect(strategy.estimateSize(new RepresentationMetadata())).resolves.toEqual(
        // This '5' comes from the reporter mock a little up in this file
        expect.objectContaining({ unit: mockSize.unit, amount: 5 }),
      );
    });
    it('should return undefined when the reporter returns undefined.', async(): Promise<void> => {
      mockReporter.estimateSize.mockResolvedValueOnce(undefined);
      await expect(strategy.estimateSize(new RepresentationMetadata())).resolves.toBeUndefined();
    });
  });

  describe('createQuotaGuard()', (): void => {
    it('should return a passthrough that destroys the stream when quota is exceeded.', async(): Promise<void> => {
      jest.spyOn(strategy, 'getAvailableSpace').mockResolvedValue({ amount: 50, unit: mockSize.unit });
      const fiftyChars = 'A'.repeat(50);
      const stream = guardedStreamFrom(fiftyChars);
      const track = await strategy.createQuotaGuard({ path: `${base}nested/file2.txt` });
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
