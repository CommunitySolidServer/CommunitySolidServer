import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import { GlobalQuotaStrategy } from '../../../src/storage/quota/GlobalQuotaStrategy';
import { UNIT_BYTES } from '../../../src/storage/size-reporter/Size';
import type { Size } from '../../../src/storage/size-reporter/Size';
import type { SizeReporter } from '../../../src/storage/size-reporter/SizeReporter';

describe('GlobalQuotaStrategy', (): void => {
  let strategy: GlobalQuotaStrategy;
  let mockSize: Size;
  let mockReporter: jest.Mocked<SizeReporter<any>>;
  let mockBase: string;

  beforeEach((): void => {
    mockSize = { amount: 2000, unit: UNIT_BYTES };
    mockBase = '';
    mockReporter = {
      getSize: jest.fn(async(identifier: ResourceIdentifier): Promise<Size> => ({
        unit: mockSize.unit,
        // This mock will return 1000 as size of the root and 50 for any other resource
        amount: identifier.path === mockBase ? 1000 : 50,
      })),
      getUnit: jest.fn().mockReturnValue(mockSize.unit),
      calculateChunkSize: jest.fn(async(chunk: any): Promise<number> => chunk.length),
      estimateSize: jest.fn().mockResolvedValue(5),
    };
    strategy = new GlobalQuotaStrategy(mockSize, mockReporter, mockBase);
  });

  describe('getAvailableSpace()', (): void => {
    it('should return the correct amount of available space left.', async(): Promise<void> => {
      const result = strategy.getAvailableSpace({ path: 'any/path' });
      await expect(result).resolves.toEqual(
        expect.objectContaining({ amount: mockSize.amount - 950 }),
      );
    });
  });
});
