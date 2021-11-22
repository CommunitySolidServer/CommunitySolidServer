import { RepresentationMetadata } from '../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { DataAccessor } from '../../../src/storage/accessors/DataAccessor';
import { PodQuotaStrategy } from '../../../src/storage/quota/PodQuotaStrategy';
import type { Size } from '../../../src/storage/size-reporter/Size';
import type { SizeReporter } from '../../../src/storage/size-reporter/SizeReporter';
import type { IdentifierStrategy } from '../../../src/util/identifiers/IdentifierStrategy';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom, pipeSafely } from '../../../src/util/StreamUtil';
import { PIM, RDF } from '../../../src/util/Vocabularies';
import { mockFs } from '../../util/Util';

jest.mock('fs');

describe('PodQuotaStrategy', (): void => {
  let strategy: PodQuotaStrategy;
  let mockSize: Size;
  let mockReporter: jest.Mocked<SizeReporter<any>>;
  let identifierStrategy: IdentifierStrategy;
  let accessor: jest.Mocked<DataAccessor>;
  const base = 'http://localhost:3000/';
  const rootFilePath = 'folder';

  beforeEach((): void => {
    jest.restoreAllMocks();
    mockFs(rootFilePath, new Date());
    mockSize = { amount: 2000, unit: 'bytes' };
    identifierStrategy = new SingleRootIdentifierStrategy(base);
    mockReporter = {
      getSize: jest.fn().mockResolvedValue({ unit: mockSize.unit, amount: 50 }),
      getUnit: jest.fn().mockReturnValue(mockSize.unit),
      calculateChunkSize: jest.fn(async(chunk: any): Promise<number> => chunk.length),
    };
    accessor = {
      // Assume that the pod is called "nested"
      getMetadata: jest.fn().mockImplementation(
        async(identifier: ResourceIdentifier): Promise<RepresentationMetadata> => {
          const res = new RepresentationMetadata();
          if (identifier.path === `${base}nested/`) {
            res.add(RDF.type, PIM.Storage);
          }
          return res;
        },
      ),
      canHandle: jest.fn(),
      writeDocument: jest.fn(),
      getData: jest.fn(),
      getChildren: jest.fn(),
      writeContainer: jest.fn(),
      deleteResource: jest.fn(),
    };
    strategy = new PodQuotaStrategy(mockSize, mockReporter, identifierStrategy, accessor);
  });

  describe('constructor()', (): void => {
    it('should set the passed parameters as properties.', async(): Promise<void> => {
      expect(strategy.limit).toEqual(mockSize);
    });
  });

  describe('getAvailableSpace()', (): void => {
    it('should return a Size containing MAX_SAFE_INTEGER when writing outside a pod.', async(): Promise<void> => {
      const result = strategy.getAvailableSpace({ path: `${base}file.txt` });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: Number.MAX_SAFE_INTEGER }));
    });
    it('should return a Size containing the available space when writing inside a pod.', async(): Promise<void> => {
      const getSizeSpy = jest.spyOn(mockReporter, 'getSize');
      const result = strategy.getAvailableSpace({ path: `${base}nested/nested2/file.txt` });
      await expect(result).resolves.toEqual(expect.objectContaining({ amount: mockSize.amount }));
      expect(getSizeSpy).toHaveBeenCalledTimes(2);
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
      'should return undefined if no content-length is present in the metadata.',
      async(): Promise<void> => {
        const metadata = new RepresentationMetadata();
        await expect(strategy.estimateSize(metadata)).resolves.toBeUndefined();
      },
    );
    it('should return a Size object containing the correct unit.', async(): Promise<void> => {
      const metadata = new RepresentationMetadata();
      metadata.contentLength = 100;
      await expect(strategy.estimateSize(metadata)).resolves.toEqual(
        expect.objectContaining({ unit: mockSize.unit }),
      );
    });
  });

  describe('trackAvailableSpace()', (): void => {
    it('should return a passthrough that destroys the stream when quota is exceeded.', async(): Promise<void> => {
      strategy.getAvailableSpace = jest.fn().mockReturnValue({ amount: 50, unit: mockSize.unit });
      const fiftyChars = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const stream = guardedStreamFrom(fiftyChars);
      const track = await strategy.trackAvailableSpace({ path: `${base}nested/file2.txt` });
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
